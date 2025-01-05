/* eslint-disable */
import Utils from "./utils";
const { create, all } = require("mathjs");
const config = {};
const math = create(all, config);

export default class FinUtils {
  // To calculate the SIP amount based on future year
  static $calculateSipByYear({ futureAmount, futureYear, roi } = {}) {
    const currentYear = new Date().getFullYear();
    if (
      Utils.$hasNulls([futureAmount, futureYear, roi]) ||
      futureYear < currentYear ||
      roi < 0
    ) {
      return null;
    }
    const numberOfMonths = (futureYear - currentYear) * 12;
    return FinUtils.$calculateSip({
      noOfMonths: numberOfMonths,
      futureAmount,
      roi: roi,
    });
  }

  // To calculate the SIP amount based on number of months
  // FV = PV × (((1 + i)^(n)) - 1) / i) × (1 + i)
  static $calculateSip({ futureAmount, noOfMonths, roi } = {}) {
    if (
      Utils.$hasNulls([futureAmount, noOfMonths, roi]) ||
      noOfMonths <= 0 ||
      roi < 0
    ) {
      return null;
    }
    const monthlyInterestRate = math.divide(roi, 100 * 12);
    const base = math.add(1, monthlyInterestRate);
    const futureValueMultiplier = math.pow(base, noOfMonths);
    const numerator = math.subtract(futureValueMultiplier, 1);
    const denominator = math.multiply(
      numerator,
      math.add(1, monthlyInterestRate)
    );
    const finalValue = math.divide(denominator, monthlyInterestRate);
    return math.divide(futureAmount, finalValue);
  }

  // To calculate the fd maturity amouont
  // A = P(1+r/n)^(n*t)
  static $calcFDMaturityAmt({ presentValue, tenure, roi, compounding } = {}) {
    const params = [presentValue, tenure, roi];
    if (Utils.$hasNulls(params) || tenure < 0 || roi < 0) {
      return null;
    }
    if (!Utils.$isValid(compounding) || !Utils.$isValidInteger(compounding)) {
      compounding = 1; // Yearly once
    }
    roi = math.divide(roi, 100 * compounding);
    const baseInterest = math.pow(
      math.add(1, roi),
      math.multiply(compounding, tenure)
    );
    return math.multiply(presentValue, baseInterest);
  }

  // To get the percentage amount
  static $getPercentAmt({ amount, percent } = {}) {
    if (!Utils.$isValid(amount) || !Utils.$isValid(percent)) {
      return null;
    }
    const percentage = math.divide(percent, 100);
    return math.multiply(amount, percentage);
  }

  // To calculate montly affordable amount for a user data
  static $getAffordableAmt({
    annualIncome,
    annualExpense,
    emi,
    fdAmt,
    fdTenure,
    fdRoi,
    fdAllocation,
    equityAmt,
    equityAllocation,
  } = {}) {
    if (!Utils.$isValid(annualIncome) || !Utils.$isValid(annualExpense)) {
      return null;
    }

    // If expense is greater than income
    if (annualExpense > annualIncome) {
      return math.subtract(annualIncome, annualExpense);
    }

    let affordableAmount = math.subtract(annualIncome, annualExpense);

    // Emi calculation
    if (Utils.$isValid(emi) && emi > 0) {
      const annualEmiAmt = math.multiply(emi, 12);
      affordableAmount = math.subtract(affordableAmount, annualEmiAmt);
    }

    // Fd calculation
    if (Utils.$isValid(fdAmt) && fdAmt > 0) {
      const fdMatureAmt = FinUtils.$calcFDMaturityAmt({
        presentValue: fdAmt,
        tenure: fdTenure,
        roi: fdRoi,
      });
      const fdGoalAmt = FinUtils.$getPercentAmt({
        amount: fdMatureAmt,
        percent: fdAllocation,
      });
      affordableAmount = math.add(affordableAmount, fdGoalAmt);
    }

    // Equity calculation
    if (Utils.$isValid(equityAmt) && equityAmt > 0) {
      const equityGoalAmt = FinUtils.$getPercentAmt({
        amount: equityAmt,
        percent: equityAllocation,
      });
      affordableAmount = math.add(affordableAmount, equityGoalAmt);
    }

    return math.divide(affordableAmount, 12);
  }
}
