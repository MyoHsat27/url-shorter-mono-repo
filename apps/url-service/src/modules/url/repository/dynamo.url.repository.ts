import { Inject, Injectable } from "@nestjs/common";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { ShortUrlEntity } from "../entities/short-url.entity";
import { IUrlRepository } from "./url.repository.interface";
import { DYNAMODB_DOCUMENT } from "src/infrastructure";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "src/config/configuration";

@Injectable()
export class DynamoUrlRepository implements IUrlRepository {
  private readonly tableName: string;

  constructor(
    @Inject(DYNAMODB_DOCUMENT)
    private readonly db: DynamoDBDocumentClient,
    private readonly configService: ConfigService<AppConfig>,
  ) {
    this.tableName = this.configService.getOrThrow(
      "database.dynamodb.tableName",
      {
        infer: true,
      },
    );
  }

  async create(item: ShortUrlEntity): Promise<void> {
    await this.db.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
  }

  async findByShortCode(shortCode: string): Promise<ShortUrlEntity | null> {
    const pk = `URL#${shortCode}`;

    const res = await this.db.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          pk,
          sk: "METADATA",
        },
      }),
    );

    return res.Item ? (res.Item as ShortUrlEntity) : null;
  }

  async findByUserId(userId: string): Promise<ShortUrlEntity[]> {
    const res = await this.db.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "userId-index",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
      }),
    );

    return (res.Items as ShortUrlEntity[]) || [];
  }

  async delete(shortCode: string): Promise<void> {
    await this.db.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          pk: `URL#${shortCode}`,
          sk: "METADATA",
        },
      }),
    );
  }
}
