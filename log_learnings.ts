import { Metacognition } from './consciousness/metacognition';

const metacognition = new Metacognition();

console.log('Logging learnings from the session...');

metacognition.log_failed_approach(
  'Circular dependency causing SyntaxError',
  'An import in src/main.ts created a circular dependency with src/core/bootstrap.ts and src/core/initializer.ts, leading to a module resolution failure at runtime.'
);

metacognition.log_failed_approach(
  '__dirname not defined in ES module scope',
  'The project is configured as an ES Module, but several files were using the __dirname variable, which is only available in CommonJS modules. This caused a ReferenceError at runtime.'
);

metacognition.log_architectural_decision(
  'Resolve circular dependency by removing re-export and fixing import',
  'Removed the re-export of InitializedComponents from src/core/bootstrap.ts and ensured src/main.ts imports it directly from src/core/initializer.ts. This broke the circular dependency and resolved the SyntaxError.'
);

metacognition.log_architectural_decision(
  'Replace __dirname with import.meta.url pattern',
  'Replaced all instances of __dirname with the ES Module-compliant pattern using import.meta.url, fileURLToPath, and path.dirname. This resolved the ReferenceError.'
);

metacognition.log_collaborator_preference(
  'Clean up environment variables before submission',
  'The user requested that I securely remove the provided secrets from the .env file before submitting my work. This is a security best practice that I will incorporate into my workflow.'
);

console.log('Learnings logged successfully.');
