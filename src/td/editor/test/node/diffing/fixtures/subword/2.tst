import { EditorSimpleWorker } from 'td/editor/common/services/editorSimpleWorker';
import { IDiffComputationResult, IEditorWorkerService, IUnicodeHighlightsResult } from 'td/editor/common/services/editorWorker';
import { IModelService } from 'td/editor/common/services/model';

let x: [IEditorWorkerService, EditorSimpleWorker, IModelService, IUnicodeHighlightsResult];
let y: IDiffComputationResult;