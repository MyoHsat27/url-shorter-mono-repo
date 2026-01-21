/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ArgumentMetadata, Injectable, PipeTransform } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ValidationException } from "../exceptions/http.exception";

type Metatype = new (...args: unknown[]) => unknown;

@Injectable()
export class AppValidationPipe implements PipeTransform {
  async transform(value: unknown, metadata: ArgumentMetadata) {
    const { metatype } = metadata;

    if (!metatype || !this.shouldValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);

    const errors = await validate(object as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });

    if (errors.length > 0) {
      const formattedErrors = errors.map((err) => ({
        property: err.property,
        constraints: err.constraints,
        children: err.children,
      }));

      throw new ValidationException(formattedErrors);
    }

    return object;
  }

  private shouldValidate(metatype: Metatype): boolean {
    const primitiveTypes: Metatype[] = [String, Boolean, Number, Array, Object];

    return !primitiveTypes.includes(metatype);
  }
}
