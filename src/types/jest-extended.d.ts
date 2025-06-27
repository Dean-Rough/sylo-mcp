import 'jest-extended'

declare global {
  namespace jest {
    interface Matchers<R> {
      toIncludeAllMembers(expected: any[]): R
      toIncludeAnyMembers(expected: any[]): R
      toIncludeSameMembers(expected: any[]): R
      toBeArrayOfSize(expected: number): R
      toSatisfyAll(predicate: (value: any) => boolean): R
      toContainValue(expected: any): R
      toContainKeys(expected: string[]): R
      toContainAllKeys(expected: string[]): R
      toContainAnyKeys(expected: string[]): R
      toContainEntries(expected: [string, any][]): R
      toContainEntry(expected: [string, any]): R
      toStartWith(expected: string): R
      toEndWith(expected: string): R
      toInclude(expected: string): R
      toEqualCaseInsensitive(expected: string): R
      toBeWithin(start: number, end: number): R
      toBeDate(): R
      toBeValidDate(): R
      toBeAfter(expected: Date): R
      toBeBefore(expected: Date): R
      toHaveBeenCalledOnce(): R
      toBeString(): R
    }
  }
}
