import { Controller, Post, Body, UseGuards, Req } from "@nestjs/common";
import { MobileService } from "../service/mobile.service";
import { JwtAuthGuard } from "src/core/jwt/jwt-auth.guard";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Replace Mobile')
@Controller('mobile-replace')
export class MobileController {
    constructor(private readonly service: MobileService) {}

    @Post('replace-phone')
    @UseGuards(JwtAuthGuard) 
    async replacePhone(@Body('newPhone') newPhone: string, @Req() req: any) {
        const userId = req.user.id;
        return await this.service.replacePhone(userId, newPhone);
    }
}