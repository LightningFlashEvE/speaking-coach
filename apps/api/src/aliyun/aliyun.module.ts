import { Module } from '@nestjs/common';
import { AliyunBailianRealtimeProvider } from './aliyun-bailian-realtime.provider';

@Module({
  providers: [AliyunBailianRealtimeProvider],
  exports: [AliyunBailianRealtimeProvider],
})
export class AliyunModule {}
