/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Nothing. All rights reserved.
 *  Licensed under the UNLICENSED License.
 *--------------------------------------------------------------------------------------------*/

import * as descriptors from './descriptors';
import {ServiceCollection} from './serviceCollection';

// ------ internal util

export namespace _util {

	export const serviceIds = new Map<string, ServiceIdentifier<any>>();

	export const DI_TARGET = '$di$target';
	export const DI_DEPENDENCIES = '$di$dependencies';

	export function getServiceDependencies(ctor: any): { id: ServiceIdentifier<any>; index: number }[] {
		return ctor[DI_DEPENDENCIES] || [];
	}
}

// --- interfaces ------

export type BrandedService = { _serviceBrand: undefined };

export interface IConstructorSignature<T, Args extends any[] = []> {
	new <Services extends BrandedService[]>(...args: [...Args, ...Services]): T;
}

export interface ServicesAccessor {
	get<T>(id: ServiceIdentifier<T>): T;
}

export const IInstantiationService = createDecorator<IInstantiationService>('instantiationService');

/**
 * Given a list of arguments as a tuple, attempt to extract the leading, non-service arguments
 * to their own tuple.
 */
export type GetLeadingNonServiceArgs<TArgs extends any[]> =
	TArgs extends [] ? []
	: TArgs extends [...infer TFirst, BrandedService] ? GetLeadingNonServiceArgs<TFirst>
	: TArgs;

export interface IInstantiationService {

	readonly _serviceBrand: undefined;

	/**
	 * Synchronously creates an instance that is denoted by the descriptor
	 */
	createInstance<T>(descriptor: descriptors.SyncDescriptor0<T>): T;
	createInstance<Ctor extends new (...args: any[]) => any, R extends InstanceType<Ctor>>(ctor: Ctor, ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>): R;

	/**
	 * Calls a function with a service accessor.
	 */
	invokeFunction<R, TS extends any[] = []>(fn: (accessor: ServicesAccessor, ...args: TS) => R, ...args: TS): R;

	/**
	 * Creates a child of this service which inherits all current services
	 * and adds/overwrites the given services.
	 */
	createChild(services: ServiceCollection): IInstantiationService;
}

/**
 * https://www.typescriptlang.org/docs/handbook/2/functions.html#call-signatures
 * Identifies a service of type `T`.
 */
export interface ServiceIdentifier<T> {
  (...args: any[]): void;
  type: T;
}

/*
class NativeWindow
ParameterDecorator로서 constructor의 argment로 등록되고, 호출된다.
Decorator는 IIFE 가 되고, 스크립트(코드)가 로드 될때 Target클래스들이 변형(확장) 되어 존재한다.
*/
function storeServiceDependency(id: Function, target: Function, index: number): void {
	if ((target as any)[_util.DI_TARGET] === target) {
		(target as any)[_util.DI_DEPENDENCIES].push({id, index});
	} else {
		(target as any)[_util.DI_DEPENDENCIES] = [{id, index}];
		(target as any)[_util.DI_TARGET] = target;
	}
}

/**
 * The *only* valid way to create a {{ServiceIdentifier}}.
 */
export function createDecorator<T>(serviceId: string): ServiceIdentifier<T> {

	if (_util.serviceIds.has(serviceId)) {
		/* 이 블럭은 createDecorator() 함수를 호출 할 때, 'serviceId'에 대한 중복 호출시 동일 값 반환을 위해 존재 */
		return _util.serviceIds.get(serviceId)!;
	}

	const id = <any>function (target: Function, key: string, index: number): any {
		/* 이 변수에 할당된 함수는 @@IServiceName-decorator 형식으로 선언된후 'eval'될 때, 해당 'target'에  */
		if (arguments.length !== 3) {
			throw new Error('@IServiceName-decorator can only be used to decorate a parameter');
		}
		storeServiceDependency(id, target, index);
	};

	/* console.log(id);
	∴ function (target, key, index) {
    if (arguments.length !== 3) {
      throw new Error('@IServiceName-decorator can only be used to decorate a parameter');
    }
    storeServiceDependency(id, target, index);
  } */

  /* About toString()
    https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Object/toString#description
		When we use console.log then will be printed the value of toString().
   */
	id.toString = () => serviceId;
	/* console.log(id);
	∴ serviceId's value; */

	_util.serviceIds.set(serviceId, id);

	return id;
}
export function refineServiceDecorator<T1, T extends T1>(serviceIdentifier: ServiceIdentifier<T1>): ServiceIdentifier<T> {
	return <ServiceIdentifier<T>>serviceIdentifier;
}
