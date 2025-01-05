/* eslint-disable */
import express from "express";
import ControllerFactory from "./ControllerFactory.js";

export default class Controller {
  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static wrap(fn) {
    return (...args) => fn(...args).catch(args[2]);
  }

  static async poll({ fn, validate, interval, maxAttempts } = {}) {
    let attempts = 0;
    const executePoll = async (resolve, reject) => {
      const result = await fn();
      attempts += 1;
      if (validate(result)) {
        return resolve(result);
      }
      if (maxAttempts && attempts === maxAttempts) {
        return reject(new Error("Exceeded max attempts"));
      }
      setTimeout(executePoll, interval, resolve, reject);
    };
    return new Promise(executePoll);
  }

  static create({ router = express.Router() } = {}) {
    const controllerClass = ControllerFactory.find(this.name);
    const controllerInstance = new controllerClass();
    const routingConfig = controllerInstance.routes();
    Object.entries(routingConfig).forEach(([method, routes]) => {
      Object.entries(routes).forEach(([path, handler]) => {
        router[method](
          path,
          this.wrap(async (req, res) =>
            controllerClass[handler]({ req: req, res: res })
          )
        );
      });
    });
    if (typeof controllerInstance.registerOtherRoutes === "function") {
      controllerInstance.registerOtherRoutes(router);
    }
    return router;
  }
}
