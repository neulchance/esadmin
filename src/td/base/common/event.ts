import {LinkedList} from 'td/base/common/linkedList';
import {IDisposable, SafeDisposable} from 'td/base/common/lifecycle';

// -----------------------------------------------------------------------------------------------------------------------
// Uncomment the next line to print warnings whenever an emitter with listeners is disposed. That is a sign of code smell.
// -----------------------------------------------------------------------------------------------------------------------
const _enableDisposeWithListenerWarning = false;

/* https://www.typescriptlang.org/docs/handbook/2/functions.html#call-signatures */
export interface Event<T> {
	(listener: (e: T) => any, thisArgs?: any, disposables?: IDisposable[] /* | DisposableStore */): IDisposable;
}

class Listener<T> {

	readonly subscription = new SafeDisposable();

	constructor(
		readonly callback: (e: T) => void,
		readonly callbackThis: any | undefined,
	) { }

	invoke(e: T) {
		this.callback.call(this.callbackThis, e);
	}
}

export class Emitter<T> {
  private _event?: Event<T>;
  protected _listeners?: LinkedList<Listener<T>>;
  private _deliveryQueue?: EventDeliveryQueue;
  private _disposed: boolean = false;

  constructor() {}
  
  dispose() {
		if (!this._disposed) {
			this._disposed = true;

			// 어미터를 디스포징할 때 리스너가 있는 것은 bad, 리스너가 이미터를 유지하는 것은 worst입니다.
			// It is bad to have listeners at the time of disposing an emitter, it is worst to have listeners keep the emitter
			// alive via the reference that's embedded in their disposables. Therefore we loop over all remaining listeners and
			// unset their subscriptions/disposables. Looping and blaming remaining listeners is done on next tick because the
			// the following programming pattern is very popular:
			//
			// const someModel = this._disposables.add(new ModelObject()); // (1) create and register model
			// this._disposables.add(someModel.onDidChange(() => { ... }); // (2) subscribe and register model-event listener
			// ...later...
			// this._disposables.dispose(); disposes (1) then (2): don't warn after (1) but after the "overall dispose" is done
			if (this._listeners) {
				if (_enableDisposeWithListenerWarning) {
					const listeners = Array.from(this._listeners);
					queueMicrotask(() => {
						for (const listener of listeners) {
							if (listener.subscription.isset()) {
								listener.subscription.unset();
							}
						}
					});
				}

				this._listeners.clear();
			}
			this._deliveryQueue?.clear(this);
		}
	}

  /**
	 * For the public to allow to subscribe to events from this Emitter
	 */
  get event(): Event<T> {
    if (!this._event) {
      this._event = (callback: (e: T) => any, thisArgs?: any, disposables?: IDisposable[]) => {
        if (!this._listeners) {
          this._listeners = new LinkedList();
        }

        const listener = new Listener(callback, thisArgs/*, stack */);
				const removeListener = this._listeners.push(listener);

        const result = listener.subscription.set(() => {
					if (!this._disposed) {
						removeListener();
					}
				});
  
        return result;
      }
    }
    return this._event;
  }

  /**
	 * To be kept private to fire an event to subscribers
	 */
	fire(event: T): void {
		if (this._listeners) {
			// put all [listener,event]-pairs into delivery queue
			// then emit all event. an inner/nested event might be
			// the driver of this

			if (!this._deliveryQueue) {
				this._deliveryQueue = new PrivateEventDeliveryQueue();
			}

			for (const listener of this._listeners) {
				this._deliveryQueue.push(this, listener, event);
			}

			this._deliveryQueue.deliver();
		}
  }
}

export class EventDeliveryQueue {
	protected _queue = new LinkedList<EventDeliveryQueueElement>();

	get size(): number {
		return this._queue.size;
	}

	push<T>(emitter: Emitter<T>, listener: Listener<T>, event: T): void {
		this._queue.push(new EventDeliveryQueueElement(emitter, listener, event));
	}

	clear<T>(emitter: Emitter<T>): void {
		const newQueue = new LinkedList<EventDeliveryQueueElement>();
		for (const element of this._queue) {
			if (element.emitter !== emitter) {
				newQueue.push(element);
			}
		}
		this._queue = newQueue;
	}

	deliver(): void {
		while (this._queue.size > 0) {
			const element = this._queue.shift()!;
			try {
				element.listener.invoke(element.event);
			} catch (e) {
        console.log(e);
			}
		}
	}
}

/**
 * An `EventDeliveryQueue` that is guaranteed to be used by a single `Emitter`.
 */
class PrivateEventDeliveryQueue extends EventDeliveryQueue {
	override clear<T>(emitter: Emitter<T>): void {
		// Here we can just clear the entire linked list because
		// all elements are guaranteed to belong to this emitter
		this._queue.clear();
	}
}

class EventDeliveryQueueElement<T = any> {
	constructor(
		readonly emitter: Emitter<T>,
		readonly listener: Listener<T>,
		readonly event: T
	) { }
}
