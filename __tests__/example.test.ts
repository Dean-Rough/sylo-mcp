// import { server } from '../src/mocks/server'
// import { http, HttpResponse } from 'msw'

describe('Example Test Suite', () => {
  describe('jest-extended matchers', () => {
    it('should demonstrate array matchers', () => {
      const fruits = ['apple', 'banana', 'cherry']
      const numbers = [1, 2, 3, 4, 5]
      const mixed = ['hello', 42, true, null]

      // Array content matchers
      expect(fruits).toIncludeAllMembers(['apple', 'banana'])
      expect(fruits).toIncludeAnyMembers(['apple', 'grape'])
      expect(fruits).toIncludeSameMembers(['cherry', 'apple', 'banana'])

      // Array length and type matchers
      expect(numbers).toBeArrayOfSize(5)
      expect(numbers).toSatisfyAll((num: number) => typeof num === 'number')

      // Mixed array matchers
      expect(mixed).toIncludeAnyMembers(['hello', 42])
      expect(mixed).toContain(null)
    })

    it('should demonstrate string matchers', () => {
      const email = 'test@example.com'
      const url = 'https://api.example.com/users/123'
      const json = '{"name": "John", "age": 30}'

      // String format matchers
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) // Email validation
      expect(url).toStartWith('https://')
      expect(url).toEndWith('/123')

      // String content matchers
      expect(() => JSON.parse(json)).not.toThrow() // JSON validation
      expect('hello world').toInclude('world')
      expect('HELLO').toEqualCaseInsensitive('hello')
    })

    it('should demonstrate object matchers', () => {
      const user = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        profile: {
          age: 30,
          city: 'New York',
        },
      }

      const partialUser = { name: 'John Doe', email: 'john@example.com' }

      // Object structure matchers
      expect(user).toContainKeys(['id', 'name', 'email'])
      expect(user).toContainAllKeys(['id', 'name', 'email', 'profile'])
      expect(user).toContainAnyKeys(['id', 'username'])

      // Object content matchers
      expect(user).toContainEntries([
        ['name', 'John Doe'],
        ['id', 1],
      ])
      expect(user).toContainEntry(['email', 'john@example.com'])
      expect(user.profile).toContainValue('New York')

      // Partial matching
      expect(user).toMatchObject(partialUser)
    })

    it('should demonstrate number and date matchers', () => {
      const now = new Date()
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const numbers = [1, 2, 3, 4, 5]

      // Number matchers
      expect(3.14159).toBeWithin(3, 4)
      expect(numbers).toIncludeAllMembers([1, 2, 3])

      // Date matchers
      expect(now).toBeDate()
      expect(now).toBeValidDate()
      expect(tomorrow).toBeAfter(now)
      expect(now).toBeBefore(tomorrow)

      // ISO date string
      expect(new Date(now.toISOString())).toBeValidDate()
    })

    it('should demonstrate function and promise matchers', async () => {
      const mockFn = jest.fn()
      const asyncFn = async () => 'resolved'
      const rejectedFn = async () => {
        throw new Error('rejected')
      }

      // Function matchers
      mockFn('arg1', 'arg2')
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
      expect(mockFn).toHaveBeenCalledOnce()

      // Promise matchers
      await expect(asyncFn()).resolves.toBe('resolved')
      await expect(rejectedFn()).rejects.toThrow('rejected')

      // Async function testing
      const result = await asyncFn()
      expect(result).toBeString()
      expect(result).toHaveLength(8)
    })
  })

  // MSW API mocking tests (commented out - MSW v2 integration needs work)
  // describe('MSW API mocking', () => {
  //   it('should mock API calls successfully', async () => {
  //     // Override default handler for this test
  //     server.use(
  //       http.get('/api/test', () => {
  //         return HttpResponse.json({
  //           message: 'Hello from mock API',
  //           timestamp: new Date().toISOString()
  //         })
  //       })
  //     )

  //     const response = await fetch('/api/test')
  //     const data = await response.json()

  //     expect(response.status).toBe(200)
  //     expect(data).toContainKeys(['message', 'timestamp'])
  //     expect(data.message).toBe('Hello from mock API')
  //     expect(data.timestamp).toBeValidDate()
  //   })
  // })

  describe('Basic functionality tests', () => {
    it('should test basic JavaScript functionality', () => {
      const testObject = { name: 'Test', value: 42 }
      const testArray = [1, 2, 3, 4, 5]

      expect(testObject).toContainKeys(['name', 'value'])
      expect(testArray).toBeArrayOfSize(5)
      expect(testArray).toIncludeAllMembers([1, 2, 3])
    })
  })
})
