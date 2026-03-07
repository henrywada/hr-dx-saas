import { styled } from '@/lib/stitches.config'

// Button component with variants
export const Button = styled('button', {
  // Base styles
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '$md',
  fontSize: '$base',
  fontWeight: '$medium',
  lineHeight: '$normal',
  transition: 'all 0.2s ease',
  cursor: 'pointer',
  border: 'none',
  outline: 'none',
  userSelect: 'none',

  '&:focus-visible': {
    outline: '2px solid $primary500',
    outlineOffset: '2px',
  },

  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },

  // Variants
  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary600',
        color: 'white',
        '&:hover:not(:disabled)': {
          backgroundColor: '$primary700',
        },
        '&:active:not(:disabled)': {
          backgroundColor: '$primary800',
        },
      },
      secondary: {
        backgroundColor: '$gray200',
        color: '$gray900',
        '&:hover:not(:disabled)': {
          backgroundColor: '$gray300',
        },
        '&:active:not(:disabled)': {
          backgroundColor: '$gray400',
        },
      },
      outline: {
        backgroundColor: 'transparent',
        color: '$primary600',
        border: '1px solid $primary600',
        '&:hover:not(:disabled)': {
          backgroundColor: '$primary50',
        },
        '&:active:not(:disabled)': {
          backgroundColor: '$primary100',
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '$gray700',
        '&:hover:not(:disabled)': {
          backgroundColor: '$gray100',
        },
        '&:active:not(:disabled)': {
          backgroundColor: '$gray200',
        },
      },
      danger: {
        backgroundColor: '$error',
        color: 'white',
        '&:hover:not(:disabled)': {
          backgroundColor: '#dc2626',
        },
        '&:active:not(:disabled)': {
          backgroundColor: '#b91c1c',
        },
      },
    },
    size: {
      sm: {
        height: '2rem',
        px: '$3',
        fontSize: '$sm',
      },
      md: {
        height: '2.5rem',
        px: '$4',
        fontSize: '$base',
      },
      lg: {
        height: '3rem',
        px: '$6',
        fontSize: '$lg',
      },
    },
    fullWidth: {
      true: {
        width: '100%',
      },
    },
  },

  // Default variants
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

// Input component
export const Input = styled('input', {
  width: '100%',
  height: '2.5rem',
  px: '$3',
  py: '$2',
  fontSize: '$base',
  lineHeight: '$normal',
  color: '$gray900',
  backgroundColor: 'white',
  border: '1px solid $gray300',
  borderRadius: '$md',
  outline: 'none',
  transition: 'all 0.2s ease',

  '&::placeholder': {
    color: '$gray400',
  },

  '&:focus': {
    borderColor: '$primary500',
    boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.1)',
  },

  '&:disabled': {
    backgroundColor: '$gray100',
    cursor: 'not-allowed',
  },

  variants: {
    error: {
      true: {
        borderColor: '$error',
        '&:focus': {
          borderColor: '$error',
          boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
        },
      },
    },
    size: {
      sm: {
        height: '2rem',
        fontSize: '$sm',
      },
      md: {
        height: '2.5rem',
        fontSize: '$base',
      },
      lg: {
        height: '3rem',
        fontSize: '$lg',
      },
    },
  },

  defaultVariants: {
    size: 'md',
  },
})

// Card component
export const Card = styled('div', {
  backgroundColor: 'white',
  borderRadius: '$lg',
  boxShadow: '$base',
  overflow: 'hidden',

  variants: {
    padding: {
      none: {
        padding: 0,
      },
      sm: {
        padding: '$4',
      },
      md: {
        padding: '$6',
      },
      lg: {
        padding: '$8',
      },
    },
    hover: {
      true: {
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '$md',
          transform: 'translateY(-2px)',
        },
      },
    },
  },

  defaultVariants: {
    padding: 'md',
  },
})

// Box component (utility)
export const Box = styled('div', {})

// Flex component
export const Flex = styled('div', {
  display: 'flex',

  variants: {
    direction: {
      row: {
        flexDirection: 'row',
      },
      column: {
        flexDirection: 'column',
      },
    },
    align: {
      start: {
        alignItems: 'flex-start',
      },
      center: {
        alignItems: 'center',
      },
      end: {
        alignItems: 'flex-end',
      },
      stretch: {
        alignItems: 'stretch',
      },
    },
    justify: {
      start: {
        justifyContent: 'flex-start',
      },
      center: {
        justifyContent: 'center',
      },
      end: {
        justifyContent: 'flex-end',
      },
      between: {
        justifyContent: 'space-between',
      },
      around: {
        justifyContent: 'space-around',
      },
    },
    gap: {
      1: { gap: '$1' },
      2: { gap: '$2' },
      3: { gap: '$3' },
      4: { gap: '$4' },
      5: { gap: '$5' },
      6: { gap: '$6' },
      8: { gap: '$8' },
    },
    wrap: {
      true: {
        flexWrap: 'wrap',
      },
    },
  },

  defaultVariants: {
    direction: 'row',
    align: 'stretch',
    justify: 'start',
  },
})

// Text component
export const Text = styled('span', {
  margin: 0,
  padding: 0,
  color: '$gray900',

  variants: {
    size: {
      xs: { fontSize: '$xs' },
      sm: { fontSize: '$sm' },
      base: { fontSize: '$base' },
      lg: { fontSize: '$lg' },
      xl: { fontSize: '$xl' },
      '2xl': { fontSize: '$2xl' },
      '3xl': { fontSize: '$3xl' },
    },
    weight: {
      normal: { fontWeight: '$normal' },
      medium: { fontWeight: '$medium' },
      semibold: { fontWeight: '$semibold' },
      bold: { fontWeight: '$bold' },
    },
    color: {
      primary: { color: '$primary600' },
      secondary: { color: '$gray600' },
      success: { color: '$success' },
      warning: { color: '$warning' },
      error: { color: '$error' },
    },
  },

  defaultVariants: {
    size: 'base',
    weight: 'normal',
  },
})

// Label component
export const Label = styled('label', {
  display: 'block',
  fontSize: '$sm',
  fontWeight: '$medium',
  color: '$gray700',
  mb: '$2',
})
