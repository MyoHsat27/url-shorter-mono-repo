import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";
import { RequestContextData } from "../interfaces";

@Injectable()
export class RequestContextService {
  private readonly als = new AsyncLocalStorage<RequestContextData>();

  run(context: RequestContextData, fn: () => void): void {
    this.als.run(context, fn);
  }

  get(): RequestContextData | undefined {
    return this.als.getStore();
  }

  getRequestId(): string | undefined {
    return this.als.getStore()?.requestId;
  }
}
