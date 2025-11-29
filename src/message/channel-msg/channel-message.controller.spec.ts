import { Test, TestingModule } from '@nestjs/testing';
import { ChannelMessageController } from './channel-message.controller';
import { ChannelMessageService } from './channel-message.service';

describe('ChannelMessageController', () => {
  let controller: ChannelMessageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChannelMessageController],
      providers: [
        {
          provide: ChannelMessageService,
          useValue: {
            create: jest.fn(),
            getMessages: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ChannelMessageController>(ChannelMessageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
