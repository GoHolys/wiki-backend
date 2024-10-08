import { Injectable, NotFoundException } from '@nestjs/common';
import { WikipediaService } from '../wikipedia/wikipedia.service';
import { IntroductionResponseDto } from './dto/introduction.dto';
import { CacheService } from 'src/cache/cache.service';
import { UserService } from 'src/user/user.service';

interface CachedData {
  introduction: string;
  scrapeDate: number;
}

@Injectable()
export class IntroductionService {
  constructor(
    private readonly wikipediaService: WikipediaService,
    private readonly cacheService: CacheService,
    private readonly userService: UserService,
  ) {}

  async getIntroduction(
    articleName: string,
    language: string,
    auth: string,
  ): Promise<IntroductionResponseDto> {
    try {
      const userInfo = await this.userService.validateAndGetUser(auth);
      const { introduction, scrapeDate } = await this.getIntroductionData(
        articleName,
        userInfo ? userInfo.language : language,
      );
      return {
        scrapeDate,
        articleName,
        introduction,
        language,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(
        `Article '${articleName}' not found in ${language} Wikipedia`,
      );
    }
  }

  async getIntroductionData(
    articleName: string,
    language: string,
  ): Promise<CachedData> {
    const cacheKey = `wikipedia:${language}:${articleName}`;
    const cachedData = await this.cacheService.get(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

    const introduction = await this.wikipediaService.getWikipediaEntry(
      articleName,
      language,
    );

    const newData: CachedData = {
      introduction,
      scrapeDate: Date.now(),
    };

    await this.cacheService.set(cacheKey, JSON.stringify(newData));
    return newData;
  }
}
