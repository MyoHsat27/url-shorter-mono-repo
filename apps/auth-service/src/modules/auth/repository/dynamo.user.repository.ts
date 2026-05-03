import { Inject, Injectable } from "@nestjs/common";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { UserEntity, RefreshTokenEntity } from "../entities";
import { IUserRepository } from "./user.repository.interface";
import { DYNAMODB_DOCUMENT } from "src/infrastructure";
import { ConfigService } from "@nestjs/config";
import { AppConfig } from "src/config/configuration";

@Injectable()
export class DynamoUserRepository implements IUserRepository {
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

  async createUser(user: UserEntity): Promise<void> {
    await this.db.send(
      new PutCommand({
        TableName: this.tableName,
        Item: user,
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const res = await this.db.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "email-index",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": email,
        },
        Limit: 1,
      }),
    );

    return res.Items && res.Items.length > 0
      ? (res.Items[0] as UserEntity)
      : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const res = await this.db.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          pk: `USER#${id}`,
          sk: "METADATA",
        },
      }),
    );

    return res.Item ? (res.Item as UserEntity) : null;
  }

  async storeRefreshToken(token: RefreshTokenEntity): Promise<void> {
    await this.db.send(
      new PutCommand({
        TableName: this.tableName,
        Item: token,
      }),
    );
  }

  async findRefreshToken(tokenId: string): Promise<RefreshTokenEntity | null> {
    const res = await this.db.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          pk: `REFRESH#${tokenId}`,
          sk: "METADATA",
        },
      }),
    );

    return res.Item ? (res.Item as RefreshTokenEntity) : null;
  }

  async deleteRefreshToken(tokenId: string): Promise<void> {
    await this.db.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          pk: `REFRESH#${tokenId}`,
          sk: "METADATA",
        },
      }),
    );
  }
}
