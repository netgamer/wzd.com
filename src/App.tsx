import { useEffect, useMemo, useRef, useState } from "react";
import { AddWidgetModal } from "./components/AddWidgetModal";
import { WidgetBody } from "./components/WidgetBody";
import { createInitialState, loadState, newWidget, saveState } from "./lib/dashboard-state";
import { loadDashboardFromSupabase, saveDashboardToSupabase } from "./lib/supabase-dashboard";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import type { DashboardState, UserProfile, WidgetData, WidgetInstance, WidgetType } from "./types";

interface DragPayload {
  widgetId: string;
  fromColumnId: string;
}

const minColumnWidth = 18;

const findColumnIdForWidget = (state: DashboardState, widgetId: string): string | null => {
  for (const column of state.columns) {
    if (column.widgetIds.includes(widgetId)) {
      return column.id;
    }
  }
  return null;
};

const removeWidgetFromColumns = (columns: DashboardState["columns"], widgetId: string) =>
  columns.map((column) => ({ ...column, widgetIds: column.widgetIds.filter((id) => id !== widgetId) }));

const App = () => {
  const [dashboard, setDashboard] = useState<DashboardState>(() => {
    if (typeof window === "undefined") {
      return createInitialState();
    }
    return loadState();
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [activeResize, setActiveResize] = useState<number | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [cloudLoaded, setCloudLoaded] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveState(dashboard);
  }, [dashboard]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      if (!sessionUser?.email) {
        return;
      }
      setUser({ id: sessionUser.id, email: sessionUser.email });
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      if (!sessionUser?.email) {
        setUser(null);
        return;
      }
      setUser({ id: sessionUser.id, email: sessionUser.email });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!user?.id || !supabase) {
      setCloudLoaded(false);
      return;
    }

    setCloudLoaded(false);

    loadDashboardFromSupabase(user.id)
      .then((state) => {
        if (!active) {
          return;
        }
        if (state) {
          setDashboard(state);
        }
        setCloudLoaded(true);
      })
      .catch(() => {
        if (active) {
          setCloudLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !supabase || !cloudLoaded) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveDashboardToSupabase(user.id, dashboard);
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dashboard, cloudLoaded, user?.id]);

  useEffect(() => {
    if (activeResize === null) {
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      const boardWidth = boardRef.current?.getBoundingClientRect().width ?? 0;
      if (boardWidth <= 0) {
        return;
      }

      const delta = (event.movementX / boardWidth) * 100;
      setDashboard((prev) => {
        const columns = [...prev.columns];
        const left = columns[activeResize];
        const right = columns[activeResize + 1];

        if (!left || !right) {
          return prev;
        }

        const nextLeft = left.width + delta;
        const nextRight = right.width - delta;

        if (nextLeft < minColumnWidth || nextRight < minColumnWidth) {
          return prev;
        }

        columns[activeResize] = { ...left, width: nextLeft };
        columns[activeResize + 1] = { ...right, width: nextRight };
        return { ...prev, columns };
      });
    };

    const onMouseUp = () => setActiveResize(null);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [activeResize]);

  const addWidget = (type: WidgetType) => {
    const widget = newWidget(type);
    setDashboard((prev) => {
      const columns = [...prev.columns];
      columns[0] = { ...columns[0], widgetIds: [widget.id, ...columns[0].widgetIds] };
      return {
        columns,
        widgets: {
          ...prev.widgets,
          [widget.id]: widget
        }
      };
    });
  };

  const deleteWidget = (widgetId: string) => {
    setDashboard((prev) => {
      const nextColumns = removeWidgetFromColumns(prev.columns, widgetId);
      const nextWidgets = { ...prev.widgets };
      delete nextWidgets[widgetId];
      return { columns: nextColumns, widgets: nextWidgets };
    });
  };

  const toggleCollapse = (widgetId: string) => {
    setDashboard((prev) => {
      const widget = prev.widgets[widgetId];
      if (!widget) {
        return prev;
      }
      return {
        ...prev,
        widgets: {
          ...prev.widgets,
          [widgetId]: {
            ...widget,
            collapsed: !widget.collapsed,
            updatedAt: new Date().toISOString()
          }
        }
      };
    });
  };

  const updateWidgetData = (widgetId: string, data: WidgetData) => {
    setDashboard((prev) => {
      const widget = prev.widgets[widgetId];
      if (!widget) {
        return prev;
      }
      return {
        ...prev,
        widgets: {
          ...prev.widgets,
          [widgetId]: {
            ...widget,
            data,
            updatedAt: new Date().toISOString()
          }
        }
      };
    });
  };

  const moveWidget = (payload: DragPayload, toColumnId: string, beforeWidgetId?: string) => {
    setDashboard((prev) => {
      const fromColumnId = findColumnIdForWidget(prev, payload.widgetId) ?? payload.fromColumnId;
      if (!fromColumnId) {
        return prev;
      }

      const stripped = removeWidgetFromColumns(prev.columns, payload.widgetId);
      const columns = stripped.map((column) => {
        if (column.id !== toColumnId) {
          return column;
        }

        const nextIds = [...column.widgetIds];
        if (beforeWidgetId) {
          const targetIndex = nextIds.indexOf(beforeWidgetId);
          if (targetIndex >= 0) {
            nextIds.splice(targetIndex, 0, payload.widgetId);
          } else {
            nextIds.push(payload.widgetId);
          }
        } else {
          nextIds.push(payload.widgetId);
        }

        return {
          ...column,
          widgetIds: nextIds
        };
      });

      return { ...prev, columns };
    });
  };

  const authReady = useMemo(() => hasSupabaseConfig && Boolean(supabase), []);

  const onGoogleLogin = async () => {
    if (!supabase) {
      return;
    }

    const redirectTo = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
  };

  const onLogout = async () => {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo">wzd</span>
          <span className="subtitle">Personal Startpage</span>
        </div>

        <div className="actions">
          <button className="primary" onClick={() => setModalOpen(true)}>
            + Add Content
          </button>
          {authReady ? (
            user ? (
              <>
                <span className="user-email">{user.email}</span>
                <button className="secondary" onClick={onLogout}>
                  Logout
                </button>
              </>
            ) : (
              <button className="secondary" onClick={onGoogleLogin}>
                Google Login
              </button>
            )
          ) : (
            <span className="auth-note">Set Supabase env vars to enable login</span>
          )}
        </div>
      </header>

      <main className="dashboard" ref={boardRef}>
        {dashboard.columns.map((column, columnIndex) => (
          <div key={column.id} className="column-wrapper" style={{ width: `${column.width}%` }}>
            <section
              className="column"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const raw = event.dataTransfer.getData("application/json");
                if (!raw) {
                  return;
                }
                const payload = JSON.parse(raw) as DragPayload;
                moveWidget(payload, column.id);
              }}
            >
              {column.widgetIds.map((widgetId) => {
                const widget = dashboard.widgets[widgetId] as WidgetInstance | undefined;
                if (!widget) {
                  return null;
                }

                return (
                  <article
                    key={widget.id}
                    className="widget-card"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        "application/json",
                        JSON.stringify({ widgetId: widget.id, fromColumnId: column.id } satisfies DragPayload)
                      );
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const raw = event.dataTransfer.getData("application/json");
                      if (!raw) {
                        return;
                      }
                      const payload = JSON.parse(raw) as DragPayload;
                      moveWidget(payload, column.id, widget.id);
                    }}
                  >
                    <header className="widget-header">
                      <h3>{widget.title}</h3>
                      <div className="widget-controls">
                        <button className="icon-button" onClick={() => toggleCollapse(widget.id)}>
                          {widget.collapsed ? "+" : "-"}
                        </button>
                        <button className="icon-button" onClick={() => deleteWidget(widget.id)}>
                          x
                        </button>
                      </div>
                    </header>
                    {!widget.collapsed && (
                      <div className="widget-body">
                        <WidgetBody
                          data={widget.data}
                          onMemoChange={(text) => {
                            if (widget.data.type !== "memo") {
                              return;
                            }
                            updateWidgetData(widget.id, { ...widget.data, text });
                          }}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
            {columnIndex < dashboard.columns.length - 1 && (
              <button
                className="splitter"
                onMouseDown={() => setActiveResize(columnIndex)}
                aria-label={`Resize column ${columnIndex + 1}`}
              />
            )}
          </div>
        ))}
      </main>

      <footer className="footer">
        {user ? "Cloud synced (Supabase)" : "Local mode"} | Cloudflare Pages + Supabase + Google Auth
      </footer>

      <AddWidgetModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addWidget} />
    </div>
  );
};

export default App;
