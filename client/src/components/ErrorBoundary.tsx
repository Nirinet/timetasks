import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Button, Typography, Container, Paper } from '@mui/material'
import { ErrorOutline as ErrorIcon } from '@mui/icons-material'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to logging service
      console.error('Production error:', {
        message: error.toString(),
        stack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              אופס! משהו השתבש
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              אירעה שגיאה בלתי צפויה באפליקציה. הצוות שלנו קיבל התראה על הבעיה.
            </Typography>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, textAlign: 'left' }}>
                <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </Typography>
              </Box>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={this.handleReset}
              sx={{ mt: 3 }}
            >
              רענן את הדף
            </Button>
          </Paper>
        </Container>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary