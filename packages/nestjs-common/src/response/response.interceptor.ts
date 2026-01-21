/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, map } from "rxjs";
import { SuccessResponse } from "../dtos";
import { instanceToPlain } from "class-transformer";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data: any) => {
        if (data instanceof SuccessResponse) {
          data.data = this.transformResponse(data.data);
          return data;
        }

        if (this.isPaginatedResponse(data)) {
          const transformedPagination = {
            ...data,
            data: this.transformResponse(data.data),
          };
          return new SuccessResponse(transformedPagination);
        }

        const transformedData = this.transformResponse(data);
        return new SuccessResponse(transformedData);
      }),
    );
  }

  private isPaginatedResponse(data: any): boolean {
    const isObject = data !== null && typeof data === "object";

    if (!isObject) return false;

    const hasDataProp = "data" in data;
    const isEntity = "_id" in data || "id" in data;

    return hasDataProp && !isEntity;
  }

  private transformResponse(response: any) {
    if (Array.isArray(response)) {
      return response.map((item) => this.transformToPlain(item));
    }

    return this.transformToPlain(response);
  }

  private transformToPlain(plainOrClass: any): any {
    return plainOrClass && plainOrClass.constructor !== Object
      ? instanceToPlain(plainOrClass)
      : plainOrClass;
  }
}
