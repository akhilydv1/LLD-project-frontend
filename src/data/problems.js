export const fallbackProblems = [
  {
    id: 'parking-lot', title: 'Parking Lot with Safe Checkout', difficulty: 'Medium', minutes: 45,
    category: 'State & ownership', description: 'Model parking spots, ticket lifecycle, fees, and safe checkout when payment fails.',
    skills: ['Class design', 'State management', 'Failure handling'],
    requirements: [
      'Support BIKE, CAR and TRUCK. A bike fits any spot, a car fits CAR or TRUCK, and a truck fits only TRUCK.',
      'Prefer the smallest compatible free spot. Reject duplicate active entries and a full facility without changing occupancy.',
      'Issue one active ticket per vehicle. Compute fee by elapsed whole hours, rounding up, minimum one hour: BIKE 20, CAR 40, TRUCK 80 per hour.',
      'Payment failure must leave the ticket active and spot occupied. Successful checkout closes the ticket and frees the spot; never charge twice.',
      'Explain concurrency protection, testable time/tariff/payment dependencies, and a weekend flat-rate change.'
    ],
  },
  {
    id: 'elevator-system', title: 'Elevator Control System', difficulty: 'Medium', minutes: 40,
    category: 'State & coordination', description: 'Design elevators, floor requests, dispatching, and safe state transitions.',
    skills: ['State machines', 'Scheduling', 'Interfaces'],
    requirements: ['Support multiple elevators and floor requests.', 'Track current floor, direction, capacity and operating state.', 'Dispatch requests using a clearly stated policy.', 'Handle overload, maintenance mode, duplicate requests and emergency stop.', 'Explain how the design could support priority or service elevators.'],
  },
  {
    id: 'vending-machine', title: 'Vending Machine', difficulty: 'Easy', minutes: 30,
    category: 'State & transactions', description: 'Handle inventory, payments, dispense operations, and refunds without inconsistent state.',
    skills: ['Encapsulation', 'Transactions', 'Testing'],
    requirements: ['Products have price and available quantity.', 'A purchase validates selection and payment before dispensing.', 'Out-of-stock or insufficient-payment cases must not reduce inventory.', 'Handle dispense failure and refund behaviour.', 'Explain how to introduce a new payment method.'],
  },
  {
    id: 'splitwise', title: 'Expense Sharing', difficulty: 'Medium', minutes: 40,
    category: 'Domain modelling', description: 'Represent groups, expenses, splits, balances and settlement rules.',
    skills: ['Domain modelling', 'Money', 'Validation'],
    requirements: ['Create groups and members and record expenses.', 'Support equal and exact-amount splits.', 'Validate that split totals equal the expense total.', 'Calculate balances without floating-point money errors.', 'Explain how a percentage-based split can be added.'],
  },
  {
    id: 'library-management', title: 'Library Management', difficulty: 'Easy', minutes: 30,
    category: 'Entities & policies', description: 'Model books, copies, members, loans, due dates and renewals.',
    skills: ['Composition', 'Rules', 'Lifecycle'],
    requirements: ['Separate a book title from physical copies.', 'Support checkout, return and due dates.', 'Reject checkout when no copy is available or a member is ineligible.', 'Calculate overdue status and prevent invalid transitions.', 'Explain how holds/reservations could be introduced.'],
  },
  {
    id: 'food-delivery', title: 'Food Delivery', difficulty: 'Hard', minutes: 55,
    category: 'Workflow design', description: 'Manage orders, restaurants, delivery assignment and order lifecycle.',
    skills: ['State transitions', 'Strategy', 'Events'],
    requirements: ['Model customers, restaurants, menus, orders and delivery partners.', 'Define valid order status transitions.', 'Handle restaurant rejection and delivery assignment failure.', 'Avoid charging or notifying twice when an event is retried.', 'Explain how surge fees or a new assignment policy can be added.'],
  },
];

export const emptySections = {
  requirements: '',
  responsibilities: '',
  relationships: '',
  behavior: '',
  tradeoffs: '',
  tests: '',
  code: '',
};

export const sectionFields = [
  { key: 'requirements', label: 'Requirements & assumptions', hint: 'What must the system do? Mention important rules and assumptions.', placeholder: 'List functional requirements, constraints, and assumptions…', required: true },
  { key: 'responsibilities', label: 'Classes & responsibilities', hint: 'Name key classes/interfaces and the responsibility each one owns.', placeholder: 'Vehicle — stores vehicle identity and type…', required: true },
  { key: 'relationships', label: 'Relationships & dependencies', hint: 'Describe ownership, references, multiplicity and dependency direction.', placeholder: 'ParkingLot contains floors; a ticket references a vehicle and spot…', required: true },
  { key: 'behavior', label: 'Main flow & failure behaviour', hint: 'Walk through one use case in order, including state changes and failures.', placeholder: 'When a vehicle enters… If payment fails…', required: true },
  { key: 'tradeoffs', label: 'Design choices & change scenario', hint: 'Explain why your design is simple/extendable and how it handles a likely change.', placeholder: 'I separated fee calculation because…', required: true },
  { key: 'tests', label: 'Edge cases & test plan', hint: 'List business-rule tests, expected results and dependencies you would fake.', placeholder: 'Given a full lot, entry should be rejected without a ticket…', required: true },
  { key: 'code', label: 'Supporting code (optional)', hint: 'Paste a short relevant snippet if it helps explain your design.', placeholder: 'Optional Java / C++ / pseudocode…', required: false },
];
