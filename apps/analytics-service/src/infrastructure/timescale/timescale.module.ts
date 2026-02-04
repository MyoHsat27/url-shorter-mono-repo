import { Global, Module } from "@nestjs/common";
import { timescalePoolProvider, TIMESCALE_POOL } from "./timescale.provider";

export { TIMESCALE_POOL };

@Global()
@Module({
  providers: [timescalePoolProvider],
  exports: [timescalePoolProvider],
})
export class TimescaleModule {}
