/* eslint-disable */
import axios from "axios";
import Utils from "../util/utils";
import AzureVault from "./azureVault";

export default class LearningManagementSystem {
  static async getConfig() {
    const [
      edmingleApiUrl,
      edmingleInstituteId,
      edmingleAPIKey,
      edmingleOrganizationId,
    ] = await Promise.all([
      AzureVault.getSecret("edmingleApiUrl"),
      AzureVault.getSecret("edmingleInstituteId"),
      AzureVault.getSecret("edmingleAPIKey"),
      AzureVault.getSecret("edmingleOrganizationId"),
    ]);
    return {
      edmingleApiUrl,
      edmingleInstituteId,
      edmingleAPIKey,
      edmingleOrganizationId,
    };
  }

  static async getHeaders(contentType) {
    const { edmingleAPIKey, edmingleOrganizationId } = await this.getConfig();
    return {
      apikey: edmingleAPIKey,
      ORGID: edmingleOrganizationId,
      ...(contentType && { "Content-Type": contentType }),
    };
  }

  static async getAllCourses({ coursesSearchCriteria } = {}) {
    const edmingleConfig = await this.getConfig();
    const baseUrl = `${edmingleConfig.edmingleApiUrl}institute/${edmingleConfig.edmingleInstituteId}/courses?`;
    const params = {
      get_tutors: coursesSearchCriteria.getTutors || 0,
      get_tags: coursesSearchCriteria.getTags || 0,
      get_student_count: coursesSearchCriteria.getStudentCount || 0,
      page: coursesSearchCriteria.page || 1,
      per_page: coursesSearchCriteria.perPage || 10,
    };
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    return await axios.get(`${baseUrl}${queryString}`);
  }

  static async generateAPIKey({ generateAPIPayload } = {}) {
    if (!Utils.$isValid(generateAPIPayload)) return null;
    const edmingleConfig = await this.getConfig();
    const baseUrl = `${edmingleConfig.edmingleApiUrl}tutor/login`;
    const JSONString  = JSON.stringify(generateAPIPayload);
    return await axios.post(
      `${baseUrl}`,
      { JSONString  },
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  }

  static async invalidateAPIKey({ apiKey } = {}) {
    if (!Utils.$isValid(apiKey)) return null;
    const edmingleConfig = await this.getConfig();
    const baseUrl = `${edmingleConfig.edmingleApiUrl}user/logout`;
    const headers = { apikey: apiKey };
    return await axios.post(baseUrl, {}, { headers });
  }

  static async createLMSStudent({ studentInfoDTOForLMS } = {}) {
    if (!Utils.$isValid(studentInfoDTOForLMS)) return null;
    const edmingleConfig = await this.getConfig();
    const headers = await this.getHeaders("multipart/form-data");
    const baseUrl = `${edmingleConfig.edmingleApiUrl}organization/students`;
    const JSONString  = JSON.stringify(studentInfoDTOForLMS);
    return await axios.post(`${baseUrl}`, { JSONString  }, { headers });
  }

  // NOTE: Not required as of now.
  static async getStudentEnrolledCourses({ userId } = {}) {
    if (!Utils.$isValid(userId)) return null;
    const edmingleConfig = await this.getConfig();
    const headers = await this.getHeaders();
    const baseUrl = `${edmingleConfig.edmingleApiUrl}institution/user/bookings?user_id=${userId}`;
    return await axios.get(`${baseUrl}`, { headers });
  }

  static async updateStudent({ studentInfo } = {}) {
    if (!Utils.$isValidJson(studentInfo)) return null;
    const edmingleConfig = await this.getConfig();
    const headers = await this.getHeaders("multipart/form-data");
    const baseUrl = `${edmingleConfig.edmingleApiUrl}organization/students/${studentInfo.userId}`;
    const JSONString  = JSON.stringify(studentInfo);
    return await axios.post(`${baseUrl}`, { JSONString  }, { headers });
  }

  static async getCourseById({ courseId } = {}) {
    if (!Utils.$isValid(courseId)) return null;
    const edmingleConfig = await this.getConfig();
    const baseUrl = `${edmingleConfig.edmingleApiUrl}organization/bundles/${courseId}?get_tutors=0`;
    const headers = { ORGID: edmingleConfig.edmingleOrganizationId };
    return await axios.get(baseUrl, { headers });
  }

  static async giveCreditsToLMSUser({ lmsUserId, credits } = {}) {
    if (!Utils.$isValid(lmsUserId) || !Utils.$isValid(credits)) return null;
    const edmingleConfig = await this.getConfig();
    const headers = await this.getHeaders("multipart/form-data");
    const baseUrl = `${edmingleConfig.edmingleApiUrl}users/${lmsUserId}/edcredits`;
    const JSONString  = JSON.stringify({ num_credits: credits, is_add: 1 });
    return await axios.post(`${baseUrl}`, { JSONString  }, { headers });
  }

  static async enrollStudentToCourse({ bundleId, lmsUserId } = {}) {
    const edmingleConfig = await this.getConfig();
    const headers = await this.getHeaders("multipart/form-data");
    const baseUrl = `${edmingleConfig.edmingleApiUrl}admission/walkin/short`;
    const JSONString  = JSON.stringify({
      bundle_id: bundleId,
      user_id: lmsUserId,
      organization_id: edmingleConfig.edmingleOrganizationId,
    });
    return await axios.post(`${baseUrl}`, { JSONString  }, { headers });
  }
}
