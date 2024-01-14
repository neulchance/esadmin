import { findLast } from 'td/base/common/arrays';
import { Disposable } from 'td/base/common/lifecycle';
import { ITransaction, observableFromEvent, observableValue, transaction } from 'td/base/common/observable';
import { Range } from 'td/editor/common/core/range';
import { ScrollType } from 'td/editor/common/editorCommon';
import { IFooBar, IBar, IFoo } from 'foo';

console.log(observableFromEvent, observableValue);

console.log(observableValue, observableFromEvent);
