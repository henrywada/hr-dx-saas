import assert from 'node:assert/strict'
import test from 'node:test'

import { canMutateDocument } from '@/features/documents/canMutateDocument'

const ownerUserId = 'user-owner'
const otherUserId = 'user-other'

test('allows owner to mutate their own document', () => {
  assert.equal(
    canMutateDocument({ actorUserId: ownerUserId, ownerUserId }),
    true
  )
})

test('denies non-owner from mutating a document', () => {
  assert.equal(
    canMutateDocument({ actorUserId: otherUserId, ownerUserId }),
    false
  )
})
