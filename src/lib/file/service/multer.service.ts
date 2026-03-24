import { Injectable, BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { FileType } from '../utils/file-type.enum';

@Injectable()
export class MulterService {
  private readonly mimeTypesMap: Record<
    Exclude<FileType, FileType.any>,
    string[]
  > = {
    [FileType.image]: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ],
    [FileType.document]: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ],
    [FileType.video]: [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
    ],
    [FileType.audio]: [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
    ],
  };

  constructor() {
    if (!existsSync('./uploads')) {
      mkdirSync('./uploads');
    }
  }

  private getDiskStorage() {
    return diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    });
  }

  private fileFilter(
    fileType: FileType,
    customMimeTypes?: string[],
  ) {
    const allowed =
      fileType === FileType.any
        ? null
        : customMimeTypes || this.mimeTypesMap[fileType];

    return (req, file, cb) => {
      if (!allowed || allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new BadRequestException(
            `Unsupported file type: ${file.mimetype}`,
          ),
          false,
        );
      }
    };
  }

  singleUpload(
    fileType: FileType = FileType.image,
    fileSizeLimit = 50 * 1024 * 1024,
    customMimeTypes?: string[],
  ): MulterOptions {
    return {
      storage: this.getDiskStorage(),
      limits: { fileSize: fileSizeLimit },
      fileFilter: this.fileFilter(fileType, customMimeTypes),
    };
  }

  multipleUpload(
    maxFiles = 5,
    fileType: FileType = FileType.any,
    fileSizeLimit = 50 * 1024 * 1024,
    customMimeTypes?: string[],
  ): MulterOptions {
    return {
      storage: this.getDiskStorage(),
      limits: {
        fileSize: fileSizeLimit,
        files: maxFiles,
      },
      fileFilter: this.fileFilter(fileType, customMimeTypes),
    };
  }
}