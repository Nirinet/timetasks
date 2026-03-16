import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Box,
  InputBase,
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
      <Box ref={anchorRef} sx={{ position: 'relative', flexGrow: 1, maxWidth: 480 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: '#f1f5f9',
            borderRadius: '8px',
            px: 1.5,
            height: 40,
            transition: 'all 0.2s',
            '&:focus-within': {
              bgcolor: 'white',
              boxShadow: '0 0 0 2px rgba(45, 123, 149, 0.2)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', color: '#94a3b8', ml: 1 }}>
            {loading ? (
              <CircularProgress size={18} sx={{ color: '#94a3b8' }} />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>search</span>
            )}
          </Box>
          <InputBase
            placeholder="חיפוש משימות, פרויקטים..."
            value={query}
            onChange={handleChange}
            onFocus={() => { if (hasResults) setOpen(true) }}
            sx={{
              flex: 1,
              fontSize: '0.875rem',
              '& input': {
                py: 0.75,
                px: 1,
                '&::placeholder': {
                  color: '#94a3b8',
                  opacity: 1,
                },
              },
            }}
          />
        </Box>

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          sx={{ zIndex: 1300, width: anchorRef.current?.offsetWidth || 480 }}
        >
          <Paper
            sx={{
              mt: 0.5,
              maxHeight: 400,
              overflow: 'auto',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            }}
          >
            {results && (
              <>
                {results.tasks.length > 0 && (
                  <>
                    <Typography
                      sx={{
                        px: 2, pt: 1.5, pb: 0.5,
                        display: 'block',
                        color: 'text.secondary',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    >
                      משימות
                    </Typography>
                    <List dense disablePadding>
                      {results.tasks.map((task) => (
                        <ListItemButton
                          key={task.id}
                          onClick={() => handleNavigate('/tasks')}
                          sx={{ px: 2, '&:hover': { bgcolor: '#f8fafc' } }}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2d7b95' }}>task_alt</span>
                          </ListItemIcon>
                          <ListItemText
                            primary={task.title}
                            secondary={task.project.name}
                            primaryTypographyProps={{ noWrap: true, fontSize: '0.875rem', fontWeight: 500 }}
                            secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                          />
                          <StatusChip status={task.status} size="small" />
                        </ListItemButton>
                      ))}
                    </List>
                  </>
                )}

                {results.projects.length > 0 && (
                  <>
                    {results.tasks.length > 0 && <Divider />}
                    <Typography
                      sx={{
                        px: 2, pt: 1.5, pb: 0.5,
                        display: 'block',
                        color: 'text.secondary',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    >
                      פרויקטים
                    </Typography>
                    <List dense disablePadding>
                      {results.projects.map((project) => (
                        <ListItemButton
                          key={project.id}
                          onClick={() => handleNavigate('/projects')}
                          sx={{ px: 2, '&:hover': { bgcolor: '#f8fafc' } }}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#f97316' }}>folder</span>
                          </ListItemIcon>
                          <ListItemText
                            primary={project.name}
                            secondary={project.clients?.map((pc: any) => pc.client.name).join(', ')}
                            primaryTypographyProps={{ noWrap: true, fontSize: '0.875rem', fontWeight: 500 }}
                            secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                          />
                          <ProjectStatusChip status={project.status} size="small" />
                        </ListItemButton>
                      ))}
                    </List>
                  </>
                )}

                {results.clients.length > 0 && (
                  <>
                    {(results.tasks.length > 0 || results.projects.length > 0) && <Divider />}
                    <Typography
                      sx={{
                        px: 2, pt: 1.5, pb: 0.5,
                        display: 'block',
                        color: 'text.secondary',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    >
                      לקוחות
                    </Typography>
                    <List dense disablePadding>
                      {results.clients.map((client) => (
                        <ListItemButton
                          key={client.id}
                          onClick={() => handleNavigate('/clients')}
                          sx={{ px: 2, '&:hover': { bgcolor: '#f8fafc' } }}
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#10b981' }}>person_search</span>
                          </ListItemIcon>
                          <ListItemText
                            primary={client.name}
                            secondary={client.contactPerson}
                            primaryTypographyProps={{ noWrap: true, fontSize: '0.875rem', fontWeight: 500 }}
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
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
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
