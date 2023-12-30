export function createToken<T>(serviceId: string): TokenIdentifier<T> {
	const id = <any>function (...args: any[]): any {};
	id.toString = () => serviceId;
	
	return id;
}
export interface TokenIdentifier<T> {
  (...args: any[]): void;
  type: T;
  /*
    inject() 함수에서 이식 가능한 타입으로 ProviderToken가 있었고, 이 타입은 AbstractType을 포용하고,
    이 타입은 prototype: T; 를 요구한다.

    export declare type ProviderToken<T> = Type<T> | AbstractType<T> | InjectionToken<T>;
    export declare interface AbstractType<T> extends Function {
      prototype: T;
    }
  */
  prototype: T; 
  
}