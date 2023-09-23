import { Obj } from "@noreajs/common";
import { parseUrl } from "query-string";
import { refreshToken, requestToken } from "../helpers";
import generateBasicAuthentication from "../helpers/basicAuthFunc";
import { OauthClientConfig } from "../interfaces";
import AuthorizationCodeGrantOptions from "../interfaces/AuthorizationCodeGrantOptions";
import GetAuthorizationTokenFuncConfig from "../interfaces/GetAuthorizationTokenFuncConfig";
import GetAuthorizationUriFuncType from "../interfaces/GetAuthorizationUrlFuncConfig";
import RefreshTokenFuncConfig from "../interfaces/RefreshTokenFuncConfig";
import TokenRefreshable from "../interfaces/TokenRefreshable";
import GrantControl from "./GrantControl";

export default class AuthorizationCodeGrantControl
  extends GrantControl
  implements TokenRefreshable {
  private options: AuthorizationCodeGrantOptions;
  private redirectUri: string;

  constructor(
    config: OauthClientConfig,
    options: AuthorizationCodeGrantOptions
  ) {
    super(config);

    this.options = options;

    // callback url
    this.redirectUri = this.options.callbackUrl;
  }

  /**
   * Get authentication url
   * @param {GetAuthorizationUriFuncType} options redirect uri, response type
   */
  getAuthUri(options?: GetAuthorizationUriFuncType) {
    // create local properties
    const localState = options?.state;
    const localScopes = options?.scopes ?? this.options.scopes;
    const localRedirectUrl = options?.callbackUrl ?? this.redirectUri;

    // query params
    const queryParams: any = {
      response_type: options?.responseType ?? "code",
      redirect_uri: localRedirectUrl,
      client_id: this.options.clientId,
      state: localState,
      scope: localScopes ? localScopes.join(" ") : "",
    };

    // merged params
    const mergedParams = Obj.cleanWithEmpty(Obj.merge(
      queryParams,
      this.requestOptions.query ?? {}
    ));

    // constructing the request
    const url = new URL(this.options.authUrl);

    for (const param in mergedParams) {
      if (Object.prototype.hasOwnProperty.call(mergedParams, param)) {
        const value = mergedParams[param];
        // setting the param
        url.searchParams.set(param, value);
      }
    }

    return url.toString();
  }

  /**
   * Get token with the authorization code extracted in the callback uri
   * @param params {GetAuthorizationTokenFuncConfig} parameters
   */
  async getToken<T = any>(params: GetAuthorizationTokenFuncConfig<T>) {
    try {
      // callback url data
      const urlData = parseUrl(params.callbackUrl);

      // local state
      let localState = params.state;
      const localRedirectUrl = params?.redirectUri ?? this.redirectUri;

      // force array
      if (localState === null || localState === undefined) {
        localState = [];
      } else if (!Array.isArray(localState)) {
        localState = [localState];
      }

      // state exists
      if (urlData.query.state && !localState.includes(urlData.query.state as string)) {
        if (this.log === true || params.log === true) {
          console.log("Corrupted answer, the state doesn't match.", {
            urlData: urlData,
            localState: localState,
          });
        }
        throw new Error(`Corrupted answer, the state doesn't match.`);
      }

      if (urlData.query.code) {
        // headers
        const requestHeaders: any = {};

        // body
        const requestBody: any = {
          grant_type: "authorization_code",
          code: urlData.query.code,
          redirect_uri: localRedirectUrl,
          state: localState,
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
            if (params.onSuccess)
              params.onSuccess(data, urlData.query.state as string);
          },
          requestOptions: params.requestOptions,
          log: params.log
        });
      } else {
        throw urlData.query;
      }
    } catch (error) {
      if (params.onError) {
        params.onError(error);
      } else {
        throw error;
      }
    }
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
