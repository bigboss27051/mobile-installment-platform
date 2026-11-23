import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { DeviceCheckInService } from './device-check-in.service';
import { DeviceCommandsService } from './device-commands.service';
import { AckDeviceCommandDto } from './dto/ack-device-command.dto';
import { AgentHeartbeatDto } from './dto/agent-heartbeat.dto';
import { CheckInDeviceDto } from './dto/check-in-device.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Controller('devices')
export class DeviceAgentController {
  constructor(
    private readonly checkInService: DeviceCheckInService,
    private readonly commands: DeviceCommandsService,
  ) {}

  @Post('enroll/check-in')
  async checkIn(
    @Body() dto: CheckInDeviceDto,
    @Headers('x-enrollment-token') enrollmentToken: string | undefined,
    @Headers('authorization') authorization: string | undefined,
  ) {
    const bearer = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : undefined;
    const token = enrollmentToken?.trim() || bearer;
    if (!token) {
      throw new BadRequestException('ENROLLMENT_TOKEN_REQUIRED');
    }
    const data = await this.checkInService.checkIn(token, dto);
    return { data };
  }

  @Get('agent/policy')
  async getPolicy(
    @Headers('x-device-agent-token') agentToken: string | undefined,
  ) {
    const data = await this.commands.policyForAgent(agentToken ?? '');
    return { data };
  }

  @Post('agent/heartbeat')
  async heartbeat(
    @Body() dto: AgentHeartbeatDto,
    @Headers('x-device-agent-token') agentToken: string | undefined,
  ) {
    const data = await this.commands.heartbeatForAgent(agentToken ?? '', dto);
    return { data };
  }

  @Post('agent/push-token')
  async registerPushToken(
    @Body() dto: RegisterPushTokenDto,
    @Headers('x-device-agent-token') agentToken: string | undefined,
  ) {
    const data = await this.commands.registerPushTokenForAgent(
      agentToken ?? '',
      dto,
    );
    return { data };
  }

  @Get('agent/commands')
  async pollCommands(
    @Headers('x-device-agent-token') agentToken: string | undefined,
  ) {
    const data = await this.commands.pollForAgent(agentToken ?? '');
    return { data };
  }

  @Post('agent/commands/:id/ack')
  async ackCommand(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AckDeviceCommandDto,
    @Headers('x-device-agent-token') agentToken: string | undefined,
  ) {
    const data = await this.commands.ackForAgent(agentToken ?? '', id, dto);
    return { data };
  }
}
