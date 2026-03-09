import { useEffect, useMemo, useRef, useState } from "react";
import { AddWidgetModal } from "./components/AddWidgetModal";
import { WidgetBody } from "./components/WidgetBody";
import { createInitialState, loadState, newWidget, saveState } from "./lib/dashboard-state";
import { getDashboardSignature, loadDashboardFromSupabase, saveDashboardToSupabase } from "./lib/supabase-dashboard";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import type { AgentItem, DashboardState, UserProfile, WidgetData, WidgetInstance, WidgetType } from "./types";

interface DragPayload {
  widgetId: string;
  fromColumnId: string;
}

const minColumnWidth = 18;
const agentApiBaseUrl = import.meta.env.VITE_AGENT_API_BASE_URL || "http://localhost:8787";

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

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
  const [canCloudWrite, setCanCloudWrite] = useState(false);
  const [syncError, setSyncError] = useState<string>("");
  const [saveRetryToken, setSaveRetryToken] = useState(0);
  const [runningAgentIds, setRunningAgentIds] = useState<string[]>([]);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const lastSignatureRef = useRef<string>(getDashboardSignature(dashboard));
  const skipNextCloudSaveRef = useRef(false);

  useEffect(() => {
    saveState(dashboard);
    lastSignatureRef.current = getDashboardSignature(dashboard);
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
      setCanCloudWrite(false);
      setSyncError("");
      return;
    }

    setCloudLoaded(false);

    loadDashboardFromSupabase(user.id)
      .then((state) => {
        if (!active) {
          return;
        }

        if (state) {
          skipNextCloudSaveRef.current = true;
          setDashboard(state);
        } else {
          setSaveRetryToken((value) => value + 1);
        }

        setCloudLoaded(true);
        setCanCloudWrite(true);
        setSyncError("");
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "클라우드 불러오기에 실패했습니다";
        setSyncError(`불러오기 실패: ${message}`);
        setCanCloudWrite(false);
        setCloudLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !supabase || !cloudLoaded || !canCloudWrite) {
      return;
    }

    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void saveDashboardToSupabase(user.id, dashboard)
        .then(() => setSyncError(""))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "클라우드 저장에 실패했습니다";
          setSyncError(`저장 실패: ${message}`);
          window.setTimeout(() => {
            setSaveRetryToken((value) => value + 1);
          }, 2000);
        });
    }, 120);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dashboard, canCloudWrite, cloudLoaded, saveRetryToken, user?.id]);

  useEffect(() => {
    if (!user?.id || !supabase || !cloudLoaded || !canCloudWrite) {
      return;
    }

    let stopped = false;

    const pullRemote = async () => {
      try {
        const remoteState = await loadDashboardFromSupabase(user.id);
        if (!remoteState || stopped) {
          return;
        }

        const remoteSignature = getDashboardSignature(remoteState);
        if (remoteSignature !== lastSignatureRef.current) {
          skipNextCloudSaveRef.current = true;
          setDashboard(remoteState);
          setSyncError("");
        }
      } catch (error: unknown) {
        if (!stopped) {
          const message = error instanceof Error ? error.message : "다른 브라우저 변경 동기화에 실패했습니다";
          setSyncError(`동기화 실패: ${message}`);
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void pullRemote();
    }, 3000);

    const onFocus = () => {
      void pullRemote();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [canCloudWrite, cloudLoaded, user?.id]);

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

  const appendAgentMessages = (widgetId: string, agentId: string, messages: { role: "user" | "assistant"; content: string }[]) => {
    setDashboard((prev) => {
      const widget = prev.widgets[widgetId];
      if (!widget || widget.data.type !== "agent") {
        return prev;
      }

      const nextItems = widget.data.items.map((item) => {
        if (item.id !== agentId) {
          return item;
        }

        return {
          ...item,
          messages: [
            ...item.messages,
            ...messages.map((message) => ({
              id: makeId(),
              role: message.role,
              content: message.content,
              createdAt: new Date().toISOString()
            }))
          ]
        } as AgentItem;
      });

      return {
        ...prev,
        widgets: {
          ...prev.widgets,
          [widgetId]: {
            ...widget,
            data: {
              ...widget.data,
              items: nextItems
            },
            updatedAt: new Date().toISOString()
          }
        }
      };
    });
  };

  const runAgent = async ({
    widgetId,
    agentId,
    agentType,
    prompt,
    scheduleCron
  }: {
    widgetId: string;
    agentId: string;
    agentType: AgentItem["role"];
    prompt: string;
    scheduleCron?: string;
  }) => {
    if (!prompt.trim()) {
      return;
    }

    setRunningAgentIds((prev) => (prev.includes(agentId) ? prev : [...prev, agentId]));
    appendAgentMessages(widgetId, agentId, [{ role: "user", content: prompt }]);

    try {
      const response = await fetch(`${agentApiBaseUrl}/api/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          agentType,
          prompt,
          context: `userId=${user?.id ?? "anonymous"}`,
          scheduleCron,
          workflowName: scheduleCron ? `${agentType}-${Date.now()}` : undefined
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "에이전트 실행에 실패했습니다");
      }

      const workflowMessage = payload.workflow?.id
        ? `\n\n[n8n 워크플로우 생성됨] workflowId=${payload.workflow.id}`
        : "";

      appendAgentMessages(widgetId, agentId, [{ role: "assistant", content: `${payload.answer}${workflowMessage}` }]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "에이전트 실행 중 오류가 발생했습니다";
      appendAgentMessages(widgetId, agentId, [{ role: "assistant", content: `오류: ${message}` }]);
    } finally {
      setRunningAgentIds((prev) => prev.filter((id) => id !== agentId));
    }
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
          <span className="subtitle">개인 시작페이지</span>
        </div>

        <div className="actions">
          <button className="primary" onClick={() => setModalOpen(true)}>
            + 위젯 추가
          </button>
          {authReady ? (
            user ? (
              <>
                <span className="user-email">{user.email}</span>
                <button className="secondary" onClick={onLogout}>
                  로그아웃
                </button>
              </>
            ) : (
              <button className="secondary" onClick={onGoogleLogin}>
                구글 로그인
              </button>
            )
          ) : (
            <span className="auth-note">Supabase 환경변수를 설정하면 로그인을 사용할 수 있습니다</span>
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
                          onAgentRun={({ agentId, agentType, prompt, scheduleCron }) =>
                            runAgent({ widgetId: widget.id, agentId, agentType, prompt, scheduleCron })
                          }
                          runningAgentIds={runningAgentIds}
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
                aria-label={`${columnIndex + 1}번 컬럼 너비 조절`}
              />
            )}
          </div>
        ))}
      </main>

      <footer className="footer">
        {user ? "클라우드 동기화 사용 중(슈파베이스)" : "로컬 모드"} | 클라우드플레어 페이지스 + 슈파베이스 + 구글 인증
        {syncError ? ` | ${syncError}` : ""}
      </footer>

      <AddWidgetModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addWidget} />
    </div>
  );
};

export default App;
