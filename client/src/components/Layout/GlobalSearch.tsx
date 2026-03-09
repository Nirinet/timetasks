import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Box,
  TextField,
  InputAdornment,
  Paper,
  Popper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  ClickAwayListener,
  CircularProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AssignmentIcon from '@mui/icons-material/Assignment'
import FolderIcon from '@mui/icons-material/Folder'
import BusinessIcon from '@mui/icons-material/Business'
import { useNavigate } from 'react-router-dom'

import api from '@/services/api'
import { SearchResult } from '@/types'
import StatusChip from '@/components/StatusChip'
import ProjectStatusChip from '@/components/ProjectStatusChip'

const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const navigate = useNavigate()

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null)
      setOpen(false)
      return
    }

    setLoading(true)
    try {
      const response = await api.get('/search', { params: { q } })
      const data = response.data.data as SearchResult
      setResults(data)
      const hasResults =
        data.tasks.length > 0 || data.projects.length > 0 || data.clients.length > 0
      setOpen(hasResults)
    } catch {
      setResults(null)
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      search(value.trim())
    }, 300)
  }

  const handleNavigate = (path: string) => {
    setOpen(false)
    setQuery('')
    setResults(null)
    navigate(path)
  }

  const handleClose = () => {
    setOpen(false)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const hasResults = results && (
    results.tasks.length > 0 ||
    results.projects.length > 0 ||
    results.clients.length > 0
  )

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Box ref={anchorRef} sx={{ position: 'relative', mx: 2, flexGrow: 1, maxWidth: 400 }}>
        <TextField
          size="small"
          placeholder="חיפוש משימות, פרויקטים, לקוחות..."
          value={query}
          onChange={handleChange}
          onFocus={() => {
            if (hasResults) setOpen(true)
          }}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading ? <CircularProgress size={20} /> : <SearchIcon />}
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'action.hover',
              borderRadius: 2,
              '& fieldset': { border: 'none' },
              '&:hover': { bgcolor: 'action.selected' },
              '&.Mui-focused': {
                bgcolor: 'background.paper',
                '& fieldset': { border: '1px solid', borderColor: 'primary.main' },
              },
            },
          }}
        />

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          sx={{ zIndex: 1300, width: anchorRef.current?.offsetWidth || 400 }}
        >
          <Paper
            elevation={8}
            sx={{ mt: 0.5, maxHeight: 400, overflow: 'auto', borderRadius: 2 }}
          >
            {results && (
              <>
                {/* Tasks */}
                {results.tasks.length > 0 && (
                  <>
                    <Typography
                      variant="caption"
                      sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600 }}
                    >
                      משימות
                    </Typography>
                    <List dense disablePadding>
                      {results.tasks.map((task) => (
                        <ListItemButton
                          key={task.id}
                          onClick={() => handleNavigate('/tasks')}
                          sx={{ px: 2 }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <AssignmentIcon fontSize="small" color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={task.title}
                            secondary={task.project.name}
                            primaryTypographyProps={{ noWrap: true, fontSize: '0.875rem' }}
                            secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                          />
                          <StatusChip status={task.status} size="small" />
                        </ListItemButton>
                      ))}
                    </List>
                  </>
                )}

                {/* Projects */}
                {results.projects.length > 0 && (
                  <>
                    {results.tasks.length > 0 && <Divider />}
                    <Typography
                      variant="caption"
                      sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600 }}
                    >
                      פרויקטים
                    </Typography>
                    <List dense disablePadding>
                      {results.projects.map((project) => (
                        <ListItemButton
                          key={project.id}
                          onClick={() => handleNavigate('/projects')}
                          sx={{ px: 2 }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <FolderIcon fontSize="small" color="warning" />
                          </ListItemIcon>
                          <ListItemText
                            primary={project.name}
                            secondary={project.client.name}
                            primaryTypographyProps={{ noWrap: true, fontSize: '0.875rem' }}
                            secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                          />
                          <ProjectStatusChip status={project.status} size="small" />
                        </ListItemButton>
                      ))}
                    </List>
                  </>
                )}

                {/* Clients */}
                {results.clients.length > 0 && (
                  <>
                    {(results.tasks.length > 0 || results.projects.length > 0) && <Divider />}
                    <Typography
                      variant="caption"
                      sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600 }}
                    >
                      לקוחות
                    </Typography>
                    <List dense disablePadding>
                      {results.clients.map((client) => (
                        <ListItemButton
                          key={client.id}
                          onClick={() => handleNavigate('/clients')}
                          sx={{ px: 2 }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <BusinessIcon fontSize="small" color="success" />
                          </ListItemIcon>
                          <ListItemText
                            primary={client.name}
                            secondary={client.contactPerson}
                            primaryTypographyProps={{ noWrap: true, fontSize: '0.875rem' }}
                            secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </>
                )}
              </>
            )}

            {query.length >= 2 && !loading && !hasResults && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  לא נמצאו תוצאות
                </Typography>
              </Box>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  )
}

export default GlobalSearch
