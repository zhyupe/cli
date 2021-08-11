import { ICommandInstance, ICoreInstance } from '@midwayjs/command-core';
import consola from 'consola';
import prettier from 'prettier';
import { inputPromptStringValue, names } from '../../lib/helper';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { compile as EJSCompile } from 'ejs';
import { generatorInvokeWrapper } from '../../lib/wrapper';
import {
  GeneratorSharedOptions,
  sharedOption,
  applyTruthyDefaultValue,
  applyFalsyDefaultValue,
  ensureBooleanType,
  applyDefaultValueToSharedOption,
} from '../utils';

export interface ControllerOptions extends GeneratorSharedOptions {
  /**
   * @description Use simplest template
   * @value false
   */
  light: boolean;
  /**
   * @description Class identifier
   */
  class: string;
}

export const mountControllerCommand = (): ICommandInstance => {
  // TODO: 从接口中直接生成选项

  const writerSharedOptions = {
    class: {
      usage: 'Class identifier',
    },
    light: { usage: 'Use simplest template' },
  };

  return {
    controller: {
      usage: 'controller genrator',
      lifecycleEvents: ['gen'],
      opts: {
        ...sharedOption,
        ...writerSharedOptions,
      },
    },
  };
};

async function controllerHandlerCore(
  { cwd: projectDirPath }: ICoreInstance,
  opts: ControllerOptions
) {
  consola.info(`Project location: ${chalk.green(projectDirPath)}`);

  const { dry, dotFile, override } = applyDefaultValueToSharedOption(opts);

  if (dry) {
    consola.success('Executing in `dry run` mode, nothing will happen.');
  }

  if (!opts.class) {
    consola.warn('Controller name cannot be empty!');
    opts.class = await inputPromptStringValue('controller name', 'sample');
  }

  const light = opts.light
    ? ensureBooleanType(opts.light)
    : applyFalsyDefaultValue(opts.light);

  const dir = opts.dir ?? 'controller';

  const controllerNames = names(opts.class);
  const fileNameNames = names(opts.file ?? opts.class);

  const fileName = dotFile
    ? `${fileNameNames.fileName}.controller`
    : fileNameNames.fileName;

  const controllerFilePath = path.resolve(
    projectDirPath,
    'src',
    dir,
    `${fileName}.ts`
  );

  consola.info(
    `Controller will be created in ${chalk.green(controllerFilePath)}`
  );

  const exist = fs.existsSync(controllerFilePath);

  if (exist && !override) {
    consola.error('File exist, enable `--override` to override existing file.');
    process.exit(0);
  } else if (exist) {
    consola.warn('Overriding exist file');
  }

  const renderedTemplate = EJSCompile(
    fs.readFileSync(
      path.join(
        __dirname,
        `../../templates/controller/${
          light ? 'controller.ts.ejs' : 'controller-full.ts.ejs'
        }`
      ),
      { encoding: 'utf8' }
    ),
    {}
  )({ name: controllerNames.className });

  const outputContent = prettier.format(renderedTemplate, {
    parser: 'typescript',
    singleQuote: true,
  });

  if (!dry) {
    fs.ensureFileSync(controllerFilePath);
    fs.writeFileSync(controllerFilePath, outputContent);
  } else {
    consola.success('Controller generator invoked with:');
    consola.info(`Class Name: ${chalk.cyan(opts.class)}`);

    consola.info(`Light: ${chalk.cyan(light)}`);

    consola.info(`Override: ${chalk.cyan(override)}`);
    consola.info(`Dot File: ${chalk.cyan(dotFile)}`);
    consola.info(`Dir: ${chalk.cyan(dir)}`);
    consola.info(`Generated File Name: ${chalk.cyan(fileNameNames.fileName)}`);

    consola.info(`File will be created: ${chalk.green(controllerFilePath)}`);
  }
}

export default async function controllerHandler(...args: unknown[]) {
  await generatorInvokeWrapper(controllerHandlerCore, ...args);
}