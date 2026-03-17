import { Module } from "@nestjs/common";
import { MobileController } from "./controller/mobile.controller";
import { MobileService } from "./service/mobile.service";

@Module({
    controllers:[MobileController],
    providers:[MobileService]
})

export class ReplacePhoneModule {}