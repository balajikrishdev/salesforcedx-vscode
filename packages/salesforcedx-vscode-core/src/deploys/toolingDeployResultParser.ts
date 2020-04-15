/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  Row,
  Table
} from '@salesforce/salesforcedx-utils-vscode/out/src/output';
import {
  DeployDetailsResult,
  DeployResult,
  DeployStatusEnum,
  ToolingDeployResult
} from '@salesforce/source-deploy-retrieve';
import { nls } from '../messages';

interface SuccessType {
  state: string;
  fullName: string;
  type: string;
  filePath: string;
}
export class ToolingDeployParser {
  public result: ToolingDeployResult;

  constructor(deployResult: ToolingDeployResult) {
    this.result = deployResult;
  }

  public buildSuccesses(componentSuccesses: DeployResult[]): SuccessType[] {
    const formattedSuccesses: SuccessType[] = [];
    let mdState: string;
    for (const success of componentSuccesses) {
      mdState = success.changed && !success.created ? 'Updated' : 'Created';
      const formattedSuccess = {
        state: mdState,
        fullName: success.fullName!,
        type: success.componentType,
        filePath: success.fileName!
      };
      formattedSuccesses.push(formattedSuccess);
    }

    const metadataSuccess = {
      state: mdState!,
      fullName: componentSuccesses[0].fullName!,
      type: componentSuccesses[0].componentType,
      filePath: `${componentSuccesses[0].fileName}-meta.xml`
    };
    formattedSuccesses.push(metadataSuccess);
    return formattedSuccesses;
  }

  public buildErrors(componentErrors: DeployResult[]) {
    const failures = [];
    for (const err of componentErrors) {
      if (err.columnNumber && err.lineNumber) {
        err.problem = `${err.problem} (${err.lineNumber}:${err.columnNumber})`;
      }
      failures.push({
        filePath: err.fileName,
        error: err.problem
      });
    }
    return failures;
  }

  public async outputResult(sourceUri?: string): Promise<string> {
    let outputResult: string;
    const table = new Table();
    let title: string;
    switch (this.result.State) {
      case DeployStatusEnum.Completed:
        title = nls.localize(`table_title_deployed_source`);
        const successRows = this.buildSuccesses(
          this.result.DeployDetails!.componentSuccesses
        );
        outputResult = table.createTable(
          (successRows as unknown) as Row[],
          [
            { key: 'state', label: nls.localize('table_header_state') },
            { key: 'fullName', label: nls.localize('table_header_full_name') },
            { key: 'type', label: nls.localize('table_header_type') },
            {
              key: 'filePath',
              label: nls.localize('table_header_project_path')
            }
          ],
          title
        );
        break;
      case DeployStatusEnum.Failed:
        const failedErrorRows = this.buildErrors(
          this.result.DeployDetails!.componentFailures
        );
        outputResult = table.createTable(
          (failedErrorRows as unknown) as Row[],
          [
            {
              key: 'filePath',
              label: nls.localize('table_header_project_path')
            },
            { key: 'error', label: nls.localize('table_header_errors') }
          ],
          nls.localize(`table_title_deploy_errors`)
        );
        break;
      case DeployStatusEnum.Queued:
        outputResult = nls.localize('beta_tapi_queue_status');
        break;
      case DeployStatusEnum.Error:
        const error = this.result.ErrorMsg!;
        const errorRows = [{ filePath: sourceUri, error }];
        outputResult = table.createTable(
          (errorRows as unknown) as Row[],
          [
            {
              key: 'filePath',
              label: nls.localize('table_header_project_path')
            },
            { key: 'error', label: nls.localize('table_header_errors') }
          ],
          nls.localize(`table_title_deploy_errors`)
        );
        break;
      default:
        outputResult = '';
    }
    return outputResult;
  }
}
