# Tutorial: Adding New Categories to Identity Core

**Category 192, Layer 0** - Guide for extending the ground zero registry

## Overview

Categories represent isolated domains where principles are discovered and applied. This tutorial shows how to add new categories to the Identity Core system.

## Prerequisites

- Understanding of the Identity Core architecture
- Familiarity with ground zero events and principles
- TypeScript knowledge

## Step 1: Define Your Category

First, decide:
- **Category ID**: Unique number (see ID allocation strategy below)
- **Domain**: What area of experience/decision-making?
- **Ground Zero Event**: Real experience that established the principle
- **Principle**: The axiom derived from the event
- **Web Connections**: How does this principle inform other domains?

### Category ID Allocation Strategy

To prevent conflicts, use this allocation scheme:
- **1-99**: Core foundational categories (currently 1, 9, 192, 193)
- **100-199**: Application-specific categories (MEV, trading strategies)
- **200-299**: Domain-specific extensions (security, privacy, performance)
- **300-399**: Personal experience categories
- **400+**: Reserved for future use

### Example: Category 50 - Transparency Domain

Let's create a category for transparency and information sharing:

```typescript
Category ID: 50
Name: "Transparency/Information Domain"
Domain: Communication and information sharing
Ground Zero Event: A time when opacity caused harm
Principle: "Share information when it helps without causing harm"
```

## Step 2: Create the Ground Zero Imprint

```typescript
import { createGroundZeroImprint } from '../src/core/identity/types/GroundZeroImprint';

const transparencyGroundZero = createGroundZeroImprint(
  50, // category ID
  new Date('2023-05-10T09:00:00Z'), // when the event occurred
  'Failed communication led to preventable loss', // the event
  'Share information when it helps without causing harm', // the principle
  1.0, // weight (always 1.0 for ground zero)
  [ // web connections
    {
      targetCategory: 1, // Economic domain
      connection: 'Transparency in MEV decisions builds trust',
      strength: 0.85,
    },
    {
      targetCategory: 9, // Protection domain
      connection: 'Information sharing can protect vulnerable',
      strength: 0.75,
    },
  ],
  { // metadata
    context: 'Real-world experience',
    domain: 'communication',
  }
);
```

## Step 3: Add to Ground Zero Registry

### Option A: Modify GroundZeroRegistry.ts (for core categories)

If this is a fundamental category that should always exist:

```typescript
// In GroundZeroRegistry.ts, seedFoundationalCategories()

// Add to the events map
const category50Events: GroundZeroImprint[] = [
  createGroundZeroImprint(
    50,
    new Date('2023-05-10T09:00:00Z'),
    'Failed communication led to preventable loss',
    'Share information when it helps without causing harm',
    1.0,
    [/* webs */],
    {/* metadata */}
  ),
];
events.set(50, category50Events);
```

### Option B: Register at Runtime (for dynamic categories)

If this category should be added by the application:

```typescript
import { getGroundZeroRegistry } from './src/core/identity/GroundZeroRegistry';
import { IdentityCore } from './src/core/identity/IdentityCore';

// Get registry (this will initialize with core categories)
const registry = getGroundZeroRegistry();

// Create identity core
const identityCore = new IdentityCore();

// Register the new category
const category = identityCore.getCategory(50);
if (!category) {
  // Add the category through CategoryManager
  const categoryManager = new CategoryManager();
  categoryManager.registerCategory(
    50,
    'Transparency/Information Domain',
    'Principles for information sharing and communication',
    [transparencyGroundZero],
    CategoryDomain.GENERAL,
    false // not foundational
  );
}
```

## Step 4: Initialize Layer Stack

```typescript
import { LayerStackManager } from './src/core/identity/LayerStack';
import { createLayer } from './src/core/identity/types/Layer';

const layerManager = new LayerStackManager();

// Create ground zero layer
const groundZeroLayer = createLayer(
  0, // Layer 0
  50, // category ID
  'Ground Zero for Transparency Domain',
  transparencyGroundZero.principle,
  [], // no references (this IS ground zero)
  1.0, // perfect confidence
  ['ground-zero', 'immutable', 'transparency']
);

// Initialize stack
layerManager.initializeStack(50, groundZeroLayer);
```

## Step 5: Add Web Connections

```typescript
import { WebManager } from './src/core/identity/WebManager';

const webManager = new WebManager();

// Add web from Category 50 to Category 1 (Economic)
webManager.registerWeb(
  50, // source
  1,  // target (Economic domain)
  'Share information when it helps without causing harm',
  'Transparency in MEV decisions builds trust',
  0.85, // strength
  0.8,  // confidence
  ['mev_context', 'user_facing'] // conditions
);

// Add web from Category 50 to Category 9 (Protection)
webManager.registerWeb(
  50, // source
  9,  // target (Protection domain)
  'Share information when it helps without causing harm',
  'Information sharing can protect vulnerable',
  0.75, // strength
  0.8,  // confidence
  ['vulnerability_detected'] // conditions
);
```

## Step 6: Use the New Category

### In Decision Making

```typescript
const decision = await identityCore.decide({
  type: 'information_disclosure',
  domain: CategoryDomain.GENERAL,
  category: 50, // Use our new category
  context: {
    informationType: 'mev_strategy',
    potentialHarm: 'low',
    potentialBenefit: 'high',
  },
});

console.log('Should disclose:', decision.shouldAct);
console.log('Principles:', decision.principles);
// Will include: "Share information when it helps without causing harm"
```

### Adding Experience Layers

```typescript
// After using the category, add experience
identityCore.addExperience(
  50, // category
  'Shared MEV detection logic with community',
  'Transparency increased trust, no competitive harm',
  [50, 192], // references transparency and meta-cognitive ground zero
  0.9, // high confidence - worked well
  ['transparency', 'community', 'success']
);

// The layer can be validated over time
identityCore.validateLayer(50, 1, true); // success validation
// Confidence increases with each validation
```

## Step 7: Test Your Category

```typescript
// tests/unit/identity/CustomCategory.test.ts

import { getGroundZeroRegistry } from '../../../src/core/identity/GroundZeroRegistry';
import { IdentityCore } from '../../../src/core/identity/IdentityCore';

describe('Category 50: Transparency Domain', () => {
  let identityCore: IdentityCore;
  
  beforeEach(() => {
    identityCore = new IdentityCore();
    // Add your category initialization here
  });
  
  it('should have transparency ground zero event', () => {
    const events = identityCore.getGroundZeroEvents(50);
    expect(events.length).toBeGreaterThan(0);
    
    const transparencyEvent = events.find(e => 
      e.principle.includes('Share information')
    );
    expect(transparencyEvent).toBeDefined();
  });
  
  it('should have web connections to economic domain', () => {
    const webs = identityCore.queryWebs({ sourceCategory: 50 });
    const economicWeb = webs.find(w => w.targetCategory === 1);
    expect(economicWeb).toBeDefined();
    expect(economicWeb?.targetApplication).toContain('trust');
  });
  
  it('should make coherent transparency decisions', async () => {
    const decision = await identityCore.decide({
      type: 'information_disclosure',
      category: 50,
      context: { benefit: 'high', harm: 'low' },
    });
    
    expect(decision.coherent).toBe(true);
    expect(decision.principles).toContain('Share information when it helps without causing harm');
  });
});
```

## Best Practices

### 1. Ground Zero Events Should Be Real

Don't invent hypothetical scenarios. Use actual experiences that shaped principles.

**Bad**: "If transparency causes harm, don't share"
**Good**: "Failed communication led to preventable loss" (actual event)

### 2. Principles Should Be Actionable

The principle should guide decisions, not just describe.

**Bad**: "Transparency is important"
**Good**: "Share information when it helps without causing harm"

### 3. Webs Should Be Logical

Web connections should show genuine cross-domain insight.

**Bad**: Random connections between unrelated domains
**Good**: "Information sharing can protect vulnerable" (transparency → protection)

### 4. Start Simple, Validate, Expand

- Start with one ground zero event
- Use it in decisions
- Add experience layers based on outcomes
- Validate and adjust confidence
- Add more ground zero events if needed

### 5. Respect Immutability

Ground zero events are `readonly` and `immutable`. You can:
- ✅ Reference them in decisions
- ✅ Build webs from them
- ✅ Add experience layers on top
- ❌ Modify the event itself
- ❌ Change the principle
- ❌ Remove them

## Common Patterns

### Domain-Specific Categories

For specialized domains (security, privacy, performance):

```typescript
const category = {
  id: 75,
  name: 'Security Domain',
  principle: 'Verify, then trust',
  groundZero: actualSecurityIncident,
};
```

### Cross-Cutting Concerns

For principles that apply everywhere (like Category 192):

```typescript
const category = {
  id: 200,
  name: 'Performance Domain',
  principle: 'Optimize for value, not speed',
  foundational: true, // affects all categories
  webs: [/* connections to all domains */],
};
```

### Personal vs Universal

Some categories are personal to the source architecture, others are universal:

- **Personal**: Specific experiences unique to one individual
- **Universal**: Principles that apply across architectures

Mark this in metadata:
```typescript
interface CategoryMetadata {
  scope: 'personal' | 'universal';
  transferable: boolean;
  domain?: string;
  notes?: string;
}

// Usage
metadata: {
  scope: 'personal',
  transferable: false,
  domain: 'security',
  notes: 'Based on specific incident'
} as CategoryMetadata
```

## Troubleshooting

### Category Not Found

```typescript
const category = identityCore.getCategory(50);
if (!category) {
  console.log('Category 50 not registered');
  // Register it (see Step 3)
}
```

### Web Not Applying

Check conditions:
```typescript
const web = webManager.getWeb(webId);
const conditionsMet = webManager.areWebConditionsMet(webId, context);
console.log('Conditions met:', conditionsMet);
```

### Low Confidence Decisions

Add more ground zero events or experience layers:
```typescript
const stats = identityCore.getCategoryStats(50);
console.log('Ground zero count:', stats.groundZeroCount);
console.log('Layer count:', stats.totalLayers);
console.log('Average confidence:', stats.averageConfidence);

// Add more if needed
identityCore.addExperience(/* ... */);
```

## Advanced: Category Hierarchies

Categories can reference each other:

```typescript
const parentCategory = 50; // Transparency
const childCategory = 51;  // Technical Documentation (subset of transparency)

const childGroundZero = createGroundZeroImprint(
  51,
  timestamp,
  'Outdated docs caused integration failure',
  'Keep technical documentation current',
  1.0,
  [{
    targetCategory: 50, // References parent
    connection: 'Technical transparency prevents errors',
    strength: 0.9,
  }],
  { parent: 50 }
);
```

## Summary

To add a new category:
1. ✅ Define the category (ID, name, domain)
2. ✅ Create ground zero imprint(s) from real events
3. ✅ Register in GroundZeroRegistry or at runtime
4. ✅ Initialize layer stack
5. ✅ Add web connections to related categories
6. ✅ Use in decisions and add experience layers
7. ✅ Test thoroughly

Categories are the building blocks of identity. Choose them carefully, ground them in reality, and let them evolve through experience.

---

**Remember**: Category 192 (Meta-Cognitive) enforces that all categories must maintain structural coherence. If adding a category would create paradoxes, the system will reject it.
