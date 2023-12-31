import { refreshToken, requestToken } from "../helpers";
import { OauthClientConfig } from "../interfaces";
import GetAuthorizationTokenFuncConfig from "../interfaces/GetAuthorizationTokenFuncConfig";
import JWTGrantOptions from "../interfaces/JWTGrantOptions";
import JWTGrantTokenFuncConfig from "../interfaces/JWTGrantTokenFuncConfig";
import RefreshTokenFuncConfig from "../interfaces/RefreshTokenFuncConfig";
import TokenRefreshable from "../interfaces/TokenRefreshable";
import GrantControl from "./GrantControl";

export default class JWTGrantControl
  extends GrantControl
  implements TokenRefreshable {
  private options: JWTGrantOptions;

  constructor(
    config: OauthClientConfig,
    options: JWTGrantOptions
  ) {
    super(config);

    this.options = options;
  }

  /**
   * Get token with the authorization code extracted in the callback uri
   * @param params {GetAuthorizationTokenFuncConfig} parameters
   */
  async getToken<T = any>(params: JWTGrantTokenFuncConfig<T>) {
    // headers
    const requestHeaders: any = {};

    // body
    const requestBody: any = {
      grant_type: params.grant_type
    };

    /**
     * Client authentication
     * ----------------------
     */
    requestHeaders["Authorization"] = `JWT ${params.jwt_token ?? this.options.jwtToken
      }`;

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
        // call the parent token
        if (params.onSuccess) params.onSuccess(data);
      },
      params: params
    });
  }
}
