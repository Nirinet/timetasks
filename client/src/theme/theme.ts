import { createTheme, alpha } from '@mui/material/styles'
import { heIL } from '@mui/material/locale'

// Design system color tokens
const PRIMARY = '#2d7b95'
const PRIMARY_LIGHT = '#e8f4f8'
const PRIMARY_DARK = '#1e5a6e'
const BG_DEFAULT = '#f6f7f8'
const BG_PAPER = '#ffffff'

const theme = createTheme(
  {
    direction: 'rtl',
    typography: {
      fontFamily: ['Heebo', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'].join(','),
      h1: { fontWeight: 700, fontSize: '2rem' },
      h2: { fontWeight: 700, fontSize: '1.75rem' },
      h3: { fontWeight: 700, fontSize: '1.5rem' },
      h4: { fontWeight: 700, fontSize: '1.25rem' },
      h5: { fontWeight: 600, fontSize: '1.125rem' },
      h6: { fontWeight: 600, fontSize: '1rem' },
      subtitle1: { fontWeight: 500, fontSize: '0.9375rem' },
      subtitle2: { fontWeight: 500, fontSize: '0.875rem' },
      body1: { fontWeight: 400, fontSize: '0.875rem' },
      body2: { fontWeight: 400, fontSize: '0.8125rem' },
      caption: { fontWeight: 400, fontSize: '0.75rem' },
      overline: { fontWeight: 500, fontSize: '0.625rem', letterSpacing: '0.05em', textTransform: 'uppercase' },
      button: { fontWeight: 700, fontSize: '0.875rem', textTransform: 'none' },
    },
    palette: {
      primary: {
        main: PRIMARY,
        light: PRIMARY_LIGHT,
        dark: PRIMARY_DARK,
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#64748b', // slate-500
        light: '#94a3b8',
        dark: '#475569',
      },
      error: {
        main: '#ef4444',
        light: '#fee2e2',
        dark: '#dc2626',
      },
      warning: {
        main: '#f97316',
        light: '#ffedd5',
        dark: '#ea580c',
      },
      info: {
        main: '#3b82f6',
        light: '#dbeafe',
        dark: '#2563eb',
      },
      success: {
        main: '#10b981',
        light: '#d1fae5',
        dark: '#059669',
      },
      background: {
        default: BG_DEFAULT,
        paper: BG_PAPER,
      },
      text: {
        primary: '#0f172a', // slate-900
        secondary: '#64748b', // slate-500
        disabled: '#94a3b8', // slate-400
      },
      divider: '#e2e8f0', // slate-200
      action: {
        hover: alpha('#0f172a', 0.04),
        selected: alpha(PRIMARY, 0.08),
        disabledBackground: alpha('#0f172a', 0.04),
      },
    },
    shape: {
      borderRadius: 8,
    },
    shadows: [
      'none',
      '0 1px 2px 0 rgba(0,0,0,0.05)',           // 1 - shadow-sm
      '0 1px 3px 0 rgba(0,0,0,0.1)',              // 2
      '0 4px 6px -1px rgba(0,0,0,0.1)',            // 3 - shadow-md
      '0 10px 15px -3px rgba(0,0,0,0.1)',          // 4
      '0 10px 15px -3px rgba(0,0,0,0.1)',          // 5
      '0 20px 25px -5px rgba(0,0,0,0.1)',          // 6 - shadow-lg
      '0 20px 25px -5px rgba(0,0,0,0.1)',          // 7
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 8 - shadow-xl
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 9
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 10
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 11
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 12
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 13
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 14
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 15
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 16
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 17
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 18
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 19
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 20
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 21
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 22
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 23
      '0 25px 50px -12px rgba(0,0,0,0.15)',        // 24
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            direction: 'rtl',
            fontFamily: `Heebo, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`,
            backgroundColor: BG_DEFAULT,
          },
          '*': {
            '&::-webkit-scrollbar': {
              width: '6px',
              height: '6px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#cbd5e1',
              borderRadius: '3px',
              '&:hover': {
                backgroundColor: '#94a3b8',
              },
            },
          },
        },
      },
      MuiAppBar: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundColor: BG_PAPER,
            color: '#0f172a',
            borderBottom: '1px solid #e2e8f0',
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: '8px',
            textTransform: 'none' as const,
            fontWeight: 700,
            fontSize: '0.875rem',
            padding: '8px 16px',
          },
          contained: {
            '&:hover': {
              opacity: 0.9,
            },
          },
          containedPrimary: {
            boxShadow: `0 1px 2px 0 ${alpha(PRIMARY, 0.2)}`,
            '&:hover': {
              boxShadow: `0 4px 6px -1px ${alpha(PRIMARY, 0.3)}`,
            },
          },
          outlined: {
            borderColor: '#e2e8f0',
            color: '#475569',
            '&:hover': {
              borderColor: '#cbd5e1',
              backgroundColor: '#f8fafc',
            },
          },
          text: {
            color: PRIMARY,
            '&:hover': {
              backgroundColor: alpha(PRIMARY, 0.05),
            },
          },
          sizeSmall: {
            padding: '4px 12px',
            fontSize: '0.8125rem',
          },
          sizeLarge: {
            padding: '12px 24px',
            fontSize: '1rem',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: alpha(PRIMARY, 0.05),
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputBase-root': {
              direction: 'rtl',
            },
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              '& fieldset': {
                borderColor: '#e2e8f0',
              },
              '&:hover fieldset': {
                borderColor: PRIMARY,
              },
              '&.Mui-focused fieldset': {
                borderColor: PRIMARY,
                borderWidth: '2px',
              },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            '& fieldset': {
              borderColor: '#e2e8f0',
            },
            '&:hover fieldset': {
              borderColor: PRIMARY,
            },
            '&.Mui-focused fieldset': {
              borderColor: PRIMARY,
              borderWidth: '2px',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            textAlign: 'right',
            direction: 'rtl',
            borderColor: '#f1f5f9',
            padding: '16px 24px',
            fontSize: '0.875rem',
          },
          head: {
            backgroundColor: '#f8fafc',
            color: '#64748b',
            fontWeight: 500,
            fontSize: '0.875rem',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: '#f8fafc !important',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: '9999px',
            fontWeight: 500,
            fontSize: '0.75rem',
          },
          sizeSmall: {
            fontSize: '0.6875rem',
            height: '24px',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: '12px',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            minHeight: '44px',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            backgroundColor: PRIMARY,
            height: '3px',
            borderRadius: '3px 3px 0 0',
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: '8px',
            border: 'none',
            color: '#64748b',
            '&.Mui-selected': {
              backgroundColor: BG_PAPER,
              color: PRIMARY,
              fontWeight: 700,
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
              '&:hover': {
                backgroundColor: BG_PAPER,
              },
            },
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: BG_DEFAULT,
            padding: '4px',
            borderRadius: '12px',
            gap: '4px',
            '& .MuiToggleButtonGroup-grouped': {
              border: 'none',
              borderRadius: '8px !important',
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            height: 8,
            borderRadius: 4,
            backgroundColor: '#f1f5f9',
          },
          bar: {
            borderRadius: 4,
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          dot: {
            backgroundColor: '#ef4444',
            borderColor: BG_PAPER,
            borderWidth: 2,
            borderStyle: 'solid',
            width: 10,
            height: 10,
            borderRadius: 5,
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            fontWeight: 600,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            '&.Mui-selected': {
              backgroundColor: alpha(PRIMARY, 0.1),
              color: PRIMARY,
              '&:hover': {
                backgroundColor: alpha(PRIMARY, 0.15),
              },
              '& .MuiListItemIcon-root': {
                color: PRIMARY,
              },
              '& .MuiListItemText-primary': {
                fontWeight: 700,
              },
            },
            '&:hover': {
              backgroundColor: '#f8fafc',
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: '#e2e8f0',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: '#1e293b',
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: '6px',
            padding: '6px 12px',
          },
        },
      },
    },
  },
  heIL,
)

export default theme
