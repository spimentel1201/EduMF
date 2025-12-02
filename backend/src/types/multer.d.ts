declare module 'multer' {
  import { RequestHandler } from 'express';

  type Field = { name: string; maxCount?: number };

  interface MulterInstance {
    single(fieldname: string): RequestHandler;
    array(fieldname: string, maxCount?: number): RequestHandler;
    fields(fields: Field[]): RequestHandler;
    none(): RequestHandler;
    any(): RequestHandler;
  }

  interface MulterOptions {
    dest?: string;
    storage?: any;
    limits?: any;
    fileFilter?: (req: any, file: any, cb: (error: any, acceptFile: boolean) => void) => void;
  }

  function multer(options?: MulterOptions): MulterInstance;

  export = multer;
}

