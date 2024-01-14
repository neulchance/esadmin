/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'td/editor/browser/coreCommands';
import 'td/editor/browser/widget/codeEditorWidget';
import 'td/editor/browser/widget/diffEditor/diffEditor.contribution';
import 'td/editor/contrib/anchorSelect/browser/anchorSelect';
import 'td/editor/contrib/bracketMatching/browser/bracketMatching';
import 'td/editor/contrib/caretOperations/browser/caretOperations';
import 'td/editor/contrib/caretOperations/browser/transpose';
import 'td/editor/contrib/clipboard/browser/clipboard';
import 'td/editor/contrib/codeAction/browser/codeActionContributions';
import 'td/editor/contrib/codelens/browser/codelensController';
import 'td/editor/contrib/colorPicker/browser/colorContributions';
import 'td/editor/contrib/colorPicker/browser/standaloneColorPickerActions';
import 'td/editor/contrib/comment/browser/comment';
import 'td/editor/contrib/contextmenu/browser/contextmenu';
import 'td/editor/contrib/cursorUndo/browser/cursorUndo';
import 'td/editor/contrib/dnd/browser/dnd';
import 'td/editor/contrib/dropOrPasteInto/browser/copyPasteContribution';
import 'td/editor/contrib/dropOrPasteInto/browser/dropIntoEditorContribution';
import 'td/editor/contrib/find/browser/findController';
import 'td/editor/contrib/folding/browser/folding';
import 'td/editor/contrib/fontZoom/browser/fontZoom';
import 'td/editor/contrib/format/browser/formatActions';
import 'td/editor/contrib/documentSymbols/browser/documentSymbols';
import 'td/editor/contrib/inlineCompletions/browser/inlineCompletions.contribution';
import 'td/editor/contrib/inlineProgress/browser/inlineProgress';
import 'td/editor/contrib/gotoSymbol/browser/goToCommands';
import 'td/editor/contrib/gotoSymbol/browser/link/goToDefinitionAtPosition';
import 'td/editor/contrib/gotoError/browser/gotoError';
import 'td/editor/contrib/hover/browser/hover';
import 'td/editor/contrib/indentation/browser/indentation';
import 'td/editor/contrib/inlayHints/browser/inlayHintsContribution';
import 'td/editor/contrib/inPlaceReplace/browser/inPlaceReplace';
import 'td/editor/contrib/lineSelection/browser/lineSelection';
import 'td/editor/contrib/linesOperations/browser/linesOperations';
import 'td/editor/contrib/linkedEditing/browser/linkedEditing';
import 'td/editor/contrib/links/browser/links';
import 'td/editor/contrib/longLinesHelper/browser/longLinesHelper';
import 'td/editor/contrib/multicursor/browser/multicursor';
import 'td/editor/contrib/parameterHints/browser/parameterHints';
import 'td/editor/contrib/rename/browser/rename';
import 'td/editor/contrib/semanticTokens/browser/documentSemanticTokens';
import 'td/editor/contrib/semanticTokens/browser/viewportSemanticTokens';
import 'td/editor/contrib/smartSelect/browser/smartSelect';
import 'td/editor/contrib/snippet/browser/snippetController2';
import 'td/editor/contrib/stickyScroll/browser/stickyScrollContribution';
import 'td/editor/contrib/suggest/browser/suggestController';
import 'td/editor/contrib/suggest/browser/suggestInlineCompletions';
import 'td/editor/contrib/tokenization/browser/tokenization';
import 'td/editor/contrib/toggleTabFocusMode/browser/toggleTabFocusMode';
import 'td/editor/contrib/unicodeHighlighter/browser/unicodeHighlighter';
import 'td/editor/contrib/unusualLineTerminators/browser/unusualLineTerminators';
import 'td/editor/contrib/wordHighlighter/browser/wordHighlighter';
import 'td/editor/contrib/wordOperations/browser/wordOperations';
import 'td/editor/contrib/wordPartOperations/browser/wordPartOperations';
import 'td/editor/contrib/readOnlyMessage/browser/contribution';
import 'td/editor/contrib/diffEditorBreadcrumbs/browser/contribution';

// Load up these strings even in VSCode, even if they are not used
// in order to get them translated
import 'td/editor/common/standaloneStrings';

import 'td/base/browser/ui/codicons/codiconStyles'; // The codicons are defined here and must be loaded
