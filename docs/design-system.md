# Ship Micro-Motion Analysis System
## Design System & UI Theme

### 1. Brand Identity

#### 1.1 Logo & Color Palette

![Color Palette](https://via.placeholder.com/800x200?text=Color+Palette)

- **Primary Color**: `#0A4B76` (Deep Navy Blue)
  - Usage: Headers, primary buttons, navigation
  - Accessibility: Passes WCAG AA on white backgrounds

- **Secondary Color**: `#00B2FF` (Ocean Blue)
  - Usage: Highlights, secondary buttons, links
  - Accessibility: Passes WCAG AA on dark backgrounds

- **Accent Color**: `#FF7A00` (High-Vis Orange)
  - Usage: Call to action, important alerts, highlights
  - Accessibility: Use sparingly, mainly for interactive elements

- **Neutral Colors**: 
  - `#F7F9FA` (Off-White) - Backgrounds
  - `#E1E8ED` (Light Gray) - Dividers, subtle backgrounds
  - `#8899A6` (Medium Gray) - Secondary text
  - `#1D2935` (Dark Gray) - Primary text

#### 1.2 Typography

- **Headings**: Inter Bold (Sans-serif)
  ```css
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  ```

- **Body**: Inter Regular (Sans-serif)
  ```css
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  ```

- **Monospace**: JetBrains Mono (for data displays)
  ```css
  font-family: 'JetBrains Mono', monospace;
  ```

- **Font Sizes**:
  - H1: 2.5rem (40px)
  - H2: 2rem (32px)
  - H3: 1.5rem (24px)
  - Body: 1rem (16px)
  - Small: 0.875rem (14px)
  - Data: 0.75rem (12px)

### 2. UI Components

#### 2.1 Component Library

- **Framework**: Tailwind CSS with custom theme
- **Component System**: Shadcn UI (Radix UI primitives with Tailwind)
- **Icons**: Heroicons
- **Visualization**: Plotly.js (for interactive data visualization)

#### 2.2 Key Components

##### Upload Zone
![Upload Component](https://via.placeholder.com/600x300?text=Upload+Component)

- Drag and drop area with progress indicator
- File type validation with visual feedback
- Clear upload status indicators

##### Processing Card
![Processing Card](https://via.placeholder.com/600x300?text=Processing+Card)

- Status display with progress and logs
- Animated indicators for active processing
- Error states with recovery options

##### Results Panel
![Results Panel](https://via.placeholder.com/600x300?text=Results+Panel)

- Tabbed interface with visualizations and metrics
- Interactive charts with hover details
- Download options for results

##### Sample Data Selector
![Sample Selector](https://via.placeholder.com/600x300?text=Sample+Selector)

- Card-based sample selection interface
- Visual previews of sample data
- Clear descriptions and metadata

### 3. Responsive Design

- **Breakpoints**:
  - Mobile: < 640px
  - Tablet: 640-1024px
  - Desktop: > 1024px

- **Layout Changes**:
  - Single column on mobile
  - Two columns on tablet
  - Full multi-column on desktop

- **Component Adaptations**:
  - Simplified visualizations on mobile
  - Collapsed navigation on smaller screens
  - Touch-friendly controls for mobile users

- **Image Handling**:
  - Progressive loading with placeholders
  - Responsive image sizing
  - Optimized for different viewport sizes

### 4. Accessibility

- **Color Contrast**: All text meets WCAG AA 4.5:1 ratio
- **Keyboard Navigation**: Full keyboard support with focus indicators
- **Screen Readers**: ARIA labels and semantic HTML
- **Reduced Motion**: Respects user preference for reduced motion
- **Text Sizing**: All text scales properly with browser settings
- **Focus Management**: Clear focus indicators and logical tab order

### 5. UI States & Feedback

- **Loading States**:
  - Skeleton loaders for content
  - Progress indicators for uploads and processing
  - Informative loading messages

- **Error States**:
  - Clear error messaging with recovery actions
  - Visual distinction for different error types
  - Helpful troubleshooting suggestions

- **Success States**:
  - Visual confirmation of completed processes
  - Summary of successful operations
  - Next step guidance

- **Empty States**:
  - Informative placeholders with suggested actions
  - Onboarding guidance for new users
  - Sample data options

### 6. Animation & Transitions

- **Principles**:
  - Subtle, purpose-driven animations
  - 200-300ms duration for most transitions
  - Easing functions: ease-in-out for most transitions

- **Key Animations**:
  - Page transitions: Fade in/out
  - Component mounting: Subtle scale and fade
  - Processing indicators: Pulsing and progress
  - Data visualization: Progressive reveal

### 7. Implementation Guidelines

- Use Tailwind utility classes for consistent styling
- Create custom components for frequently used patterns
- Maintain theme configuration in tailwind.config.js
- Document component usage with example code
- Test all components for accessibility and responsiveness

### 8. Example Theme Configuration

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0A4B76',
          light: '#1A6CA6',
          dark: '#073A5C',
        },
        secondary: {
          DEFAULT: '#00B2FF',
          light: '#33C5FF',
          dark: '#0090CC',
        },
        accent: {
          DEFAULT: '#FF7A00',
          light: '#FF9633',
          dark: '#CC6200',
        },
        neutral: {
          50: '#F7F9FA',
          100: '#E1E8ED',
          300: '#8899A6',
          800: '#1D2935',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    }
  }
}
``` 