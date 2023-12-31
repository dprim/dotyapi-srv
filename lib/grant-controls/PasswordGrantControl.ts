import { refreshToken, requestToken } from "../helpers";
import generateBasicAuthentication from "../helpers/basicAuthFunc";
import { OauthClientConfig } from "../interfaces";
import PasswordGrantFuncConfig from "../interfaces/PasswordGrantFuncConfig";
import PasswordGrantOptions from "../interfaces/PasswordGrantOptions";
import RefreshTokenFuncConfig from "../interfaces/RefreshTokenFuncConfig";
import TokenRefreshable from "../interfaces/TokenRefreshable";
import GrantControl from "./GrantControl";

export default class PasswordGrantControl
  extends GrantControl
  implements TokenRefreshable {
  private options: PasswordGrantOptions;

  constructor(config: OauthClientConfig, options: PasswordGrantOptions) {
    super(config);

    this.options = options;
  }

  /**
   * Get Password Grant Token
   * @param params parameters
   */
  async getToken<T = any>(params: PasswordGrantFuncConfig<T>) {
    // headers
    const requestHeaders: any = {};

    // body
    const requestBody: any = {
      grant_type: "password",
      username: params.username ?? this.options.username,
      password: params.password ?? this.options.password,
      scope: this.options.scopes ? this.options.scopes.join(" ") : "",
    };

    /**
     * Client authentication
     * ----------------------
     */
    if (this.options.basicAuthHeader === false) {
      requestBody["client_id"] = this.options.clientId;
      requestBody["client_secret"] = this.options.clientSecret;
    } else {
      requestHeaders["Authorization"] = generateBasicAuthentication(
        this.options.clientId,
        this.options.clientSecret ?? ""
      );
    }

    /**
     * Request a token
     */
    await requestToken<T>({
      accessTokenUrl: this.options.accessTokenUrl,
      body: requestBody,
      config: {
        oauthOptions: this.oauthOptions,
        requestOptions: this.requestOptions,
      },
      headers: requestHeaders,
      onError: params.onError,
      onSuccess: (data) => {
        // call the parent token
        if (params.onSuccess) params.onSuccess(data);
      },
      requestOptions: params.requestOptions,
    });
  }

  /**
   * Refresh the token
   * @param params parameters
   */
  async refresh<T = any>(params: RefreshTokenFuncConfig<T>) {
    await refreshToken<T>({
      accessTokenUrl: this.options.accessTokenUrl,
      config: {
        oauthOptions: this.oauthOptions,
        requestOptions: this.requestOptions,
      },
      onSuccess: (data) => {
        // update the token
        if (params.onSuccess) params.onSuccess(data);
      },
      params: params
    });
  }
}
