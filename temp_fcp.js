    // ── Floating Chat Popup ────────────────────────────────────────────────────
    var fcpOpen = false;
    var fcpConvId = null;
    var fcpConvName = '';
    var fcpConvType = '';
    var fcpMsgListener = null;
    var fcpStagedAttachments = [];
    var fcpActiveTab = 'dm';


    // Bridge: resolve scoped variables from the main script block
    function _fcpCU()  { return window._fcpGetCurrentUser  ? window._fcpGetCurrentUser()  : null; }
    function _fcpUM()  { return window._fcpGetAllUsersMap  ? window._fcpGetAllUsersMap()  : (typeof allUsersMap!=='undefined'?allUsersMap:null); }
    function _fcpCC()  { return window._fcpGetChatConvs    ? window._fcpGetChatConvs()    : (typeof chatConversations!=='undefined'?chatConversations:{}); }
    function _fcpUC()  { return window._fcpGetUnreadCounts ? window._fcpGetUnreadCounts() : (typeof unreadCounts!=='undefined'?unreadCounts:{}); }
    function _fcpEK(e) { return window._fcpEKey ? window._fcpEKey(e) : (e||'').toLowerCase().replace(/[@.]/g,'_'); }
    function _fcpDM(a,b){ return window._fcpDmId ? window._fcpDmId(a,b) : ('dm_'+[_fcpEK(a),_fcpEK(b)].sort().join('_')); }
    function _fcpEH(s) { return window._fcpEscapeHtml ? window._fcpEscapeHtml(s) : String(s).replace(/[&<>"']/g, function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);}); }
    // Firebase bridge helpers
    function _db()    { return window._fcpDb ? window._fcpDb() : (typeof db!=='undefined'?db:null); }
    function _ref(p)  { return window._fcpRef ? window._fcpRef(p) : (typeof ref!=='undefined'?ref(typeof db!=='undefined'?db:null,p):null); }
    function _onVal(r,cb){ return (window._fcpOnValue||onValue)(r,cb); }
    function _query(...a){ return (window._fcpQuery||query)(...a); }
    function _llast(n){ return (window._fcpLimitToLast||limitToLast)(n); }
    function _get(r)  { return (window._fcpGet||get)(r); }
    function _set(r,v){ return (window._fcpSet||set)(r,v); }
    function _push(r,v){ return (window._fcpPush||push)(r,v); }
    function _upd(r,v){ return (window._fcpUpdate||update)(r,v); }
    function _toast(m,t){ if(window._fcpToast) window._fcpToast(m,t); else if(typeof toast==='function') toast(m,t); }
    function _upload(f){ return window._fcpUpload ? window._fcpUpload(f) : (typeof uploadToCloudinary!=='undefined'?uploadToCloudinary(f):Promise.reject('no upload')); }
    function _f2b64(f){ return window._fcpFileToBase64 ? window._fcpFileToBase64(f) : (typeof fileToBase64!=='undefined'?fileToBase64(f):Promise.reject('no f2b')); }
    function showFloatBtn() {
        var btn = document.getElementById('float-chat-btn');
        if (btn) btn.style.display = 'flex';
    }
    function hideFloatBtn() {
        var btn = document.getElementById('float-chat-btn');
        if (btn) btn.style.display = 'none';
    }

    function toggleFloatChat() {
        fcpOpen = !fcpOpen;
        var panel = document.getElementById('float-chat-panel');
        if (fcpOpen) {
            panel.style.display = 'flex';
            fcpRenderList();
        } else {
            panel.style.display = 'none';
        }
    }

    function switchFloatTab(tab) {
        fcpActiveTab = tab;
        var dm  = document.getElementById('fcp-dm-list');
        var grp = document.getElementById('fcp-group-list');
        var btnDm  = document.getElementById('fct-dm');
        var btnGrp = document.getElementById('fct-group');
        if (tab === 'dm') {
            dm.style.display  = 'block';
            grp.style.display = 'none';
            btnDm.style.borderBottomColor  = '#4f46e5';
            btnDm.style.color  = '#4f46e5';
            btnGrp.style.borderBottomColor = 'transparent';
            btnGrp.style.color = '#94a3b8';
        } else {
            grp.style.display = 'block';
            dm.style.display  = 'none';
            btnGrp.style.borderBottomColor = '#4f46e5';
            btnGrp.style.color = '#4f46e5';
            btnDm.style.borderBottomColor  = 'transparent';
            btnDm.style.color  = '#94a3b8';
        }
    }

    function fcpRenderList() {
        fcpRenderDmList();
        fcpRenderGroupList();
    }

    function fcpUserRow(email, name, role, avatarSrc, cid, lastMsg, unread) {
        var safeName = (name || email).replace(/'/g, "&#39;");
        var isDark = document.documentElement.classList.contains('dark');
        var hoverBg = isDark ? '#253347' : '#f8fafc';
        var nameTxtColor = isDark ? '#f1f5f9' : '#1e293b';
        var subTxtColor = isDark ? '#64748b' : '#94a3b8';
        var imgBorder = isDark ? '#253347' : '#e2e8f0';
        var imgBg = isDark ? '#131929' : '#f1f5f9';
        var dotBorder = isDark ? '#1a2236' : 'white';
        return '<button onclick="fcpOpenConv(\'' + cid + '\',\'' + safeName + '\',\'dm\',\'\')" '
            + 'style="width:100%;display:flex;align-items:center;gap:10px;padding:8px 12px;background:transparent;border:none;cursor:pointer;text-align:left;" '
            + 'onmouseover="this.style.background=\'' + hoverBg + '\'" onmouseout="this.style.background=\'transparent\'">'
            + '<div style="position:relative;flex-shrink:0;">'
            + '<img src="' + avatarSrc + '" style="width:36px;height:36px;border-radius:10px;object-fit:cover;border:1px solid ' + imgBorder + ';background:' + imgBg + ';" onerror="this.src=\'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(name || email) + '\'">'
            + '<div id="fcp-online-' + _fcpEK(email) + '" style="position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;border:2px solid ' + dotBorder + ';background:#94a3b8;"></div>'
            + '</div>'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;">'
            + '<span style="font-size:11px;font-weight:700;color:' + nameTxtColor + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _fcpEH(name || email) + '</span>'
            + (unread > 0 ? '<span style="background:#ef4444;color:#fff;font-size:9px;font-weight:900;padding:1px 5px;border-radius:999px;flex-shrink:0;">' + unread + '</span>' : '')
            + '</div>'
            + '<p style="font-size:9px;color:' + subTxtColor + ';margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _fcpEH(lastMsg || role || 'Member') + '</p>'
            + '</div></button>';
    }

    function fcpRenderDmList() {
        var el = document.getElementById('fcp-dm-list');
        var currentUser = window._fcpGetCurrentUser ? window._fcpGetCurrentUser() : null;
        var allUsersMap = window._fcpGetAllUsersMap ? window._fcpGetAllUsersMap() : null;
        var chatConversations = window._fcpGetChatConvs ? window._fcpGetChatConvs() : {};
        var unreadCounts = window._fcpGetUnreadCounts ? window._fcpGetUnreadCounts() : {};
        var _eKey = window._fcpEKey || function(e){return (e||'').toLowerCase().replace(/[@.]/g,'_');};
        var _dmId = window._fcpDmId || function(a,b){var k=[_eKey(a),_eKey(b)].sort();return 'dm_'+k[0]+'_'+k[1];};
        if (!el || !_fcpCU()) return;

        // Guard: allUsersMap not ready
        if (!_fcpUM() || _fcpUM().size === 0) {
            el.innerHTML = '<p style="padding:20px;text-align:center;font-size:11px;color:#94a3b8;font-style:italic;">Loading users…</p>';
            var _getAllUsers = window._fcpGetAllUsers; if (_getAllUsers) _getAllUsers().then(function(map) {
                if (window._fcpSetAllUsersMap) window._fcpSetAllUsersMap(map);
                if (fcpOpen) fcpRenderDmList(); }).catch(function() {});

            return;
        }

        var others = Array.from(_fcpUM().values())
            .filter(function(u) { return u.email && u.email !== _fcpCU()?.email && u.email !== '123'; });

        if (!others.length) {
            el.innerHTML = '<p style="padding:20px;text-align:center;font-size:11px;color:#94a3b8;font-style:italic;">No users found</p>';
            return;
        }

        others.sort(function(a, b) {
            var cidA = _fcpDM(_fcpCU()?.email, a.email);
            var cidB = _fcpDM(_fcpCU()?.email, b.email);
            var tsA = (_fcpCC()[cidA] || {}).lastTimestamp || 0;
            var tsB = (_fcpCC()[cidB] || {}).lastTimestamp || 0;
            return tsB - tsA || (a.name || '').localeCompare(b.name || '');
        });

        el.innerHTML = others.map(function(u) {
            var cid = _fcpDM(_fcpCU()?.email, u.email);
            var conv = _fcpCC()[cid] || {};
            var lastMsg = conv.lastMessage ? conv.lastMessage.slice(0, 30) + (conv.lastMessage.length > 30 ? '…' : '') : '';
            var unread = _fcpUC()[cid] || 0;
            var avatarSrc = u.profilePicture || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.avatar || u.name || u.email));
            return fcpUserRow(u.email, u.name, u.role, avatarSrc, cid, lastMsg, unread);
        }).join('');

        // Online dots
        others.forEach(function(u) {
            _onVal(_ref('worksync/users/' + _fcpEK(u.email) + '/online'), function(sn) {
                var dot = document.getElementById('fcp-online-' + _fcpEK(u.email));
                if (dot) dot.style.background = sn.val() ? '#22c55e' : '#94a3b8';
            });
        });
    }

    function fcpRenderGroupList() {
        var el = document.getElementById('fcp-group-list');
        var currentUser = window._fcpGetCurrentUser ? window._fcpGetCurrentUser() : null;
        var chatConversations = window._fcpGetChatConvs ? window._fcpGetChatConvs() : {};
        var unreadCounts = window._fcpGetUnreadCounts ? window._fcpGetUnreadCounts() : {};
        var _eKey = window._fcpEKey || function(e){return (e||'').toLowerCase().replace(/[@.]/g,'_');};
        if (!el || !_fcpCU()) return;

        var myKey = _eKey(_fcpCU()?.email);
        var groups = Object.entries(_fcpCC() || {})
            .filter(function(e) { return e[1].type === 'group' && e[1].members && e[1].members[myKey]; })
            .sort(function(a, b) { return (b[1].lastTimestamp || 0) - (a[1].lastTimestamp || 0); });

        if (!groups.length) {
            el.innerHTML = '<p style="padding:20px;text-align:center;font-size:11px;color:#94a3b8;font-style:italic;">No groups yet</p>';
            return;
        }

        el.innerHTML = groups.map(function(entry) {
            var id = entry[0], g = entry[1];
            var unread = _fcpUC()[id] || 0;
            var name = g.name || 'Group';
            var lastMsg = g.lastMessage ? g.lastMessage.slice(0, 30) + (g.lastMessage.length > 30 ? '…' : '') : '';
            var safeName = name.replace(/'/g, "&#39;");
            var isDark = document.documentElement.classList.contains('dark');
            var hoverBg = isDark ? '#253347' : '#f8fafc';
            var nameTxtColor = isDark ? '#f1f5f9' : '#1e293b';
            var subTxtColor = isDark ? '#64748b' : '#94a3b8';
            var imgBorder = isDark ? '#253347' : '#e2e8f0';
            var avatarBg = isDark ? '#1e2a4a' : '#eef2ff';
            var avatarColor = isDark ? '#818cf8' : '#4f46e5';
            var avatarHtml = g.profilePicture
                ? '<img src="' + g.profilePicture + '" style="width:36px;height:36px;border-radius:10px;object-fit:cover;border:1px solid ' + imgBorder + ';flex-shrink:0;">'
                : '<div style="width:36px;height:36px;background:' + avatarBg + ';border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:' + avatarColor + ';flex-shrink:0;">' + _fcpEH(name.charAt(0)) + '</div>';
            return '<button onclick="fcpOpenConv(\'' + id + '\',\'' + safeName + '\',\'group\',\'\')" '
                + 'style="width:100%;display:flex;align-items:center;gap:10px;padding:8px 12px;background:transparent;border:none;cursor:pointer;text-align:left;" '
                + 'onmouseover="this.style.background=\'' + hoverBg + '\'" onmouseout="this.style.background=\'transparent\'">'
                + avatarHtml
                + '<div style="flex:1;min-width:0;">'
                + '<div style="display:flex;align-items:center;justify-content:space-between;">'
                + '<span style="font-size:11px;font-weight:700;color:' + nameTxtColor + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _fcpEH(name) + '</span>'
                + (unread > 0 ? '<span style="background:#ef4444;color:#fff;font-size:9px;font-weight:900;padding:1px 5px;border-radius:999px;flex-shrink:0;">' + unread + '</span>' : '')
                + '</div>'
                + '<p style="font-size:9px;color:' + subTxtColor + ';margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _fcpEH(lastMsg || 'Team Group') + '</p>'
                + '</div></button>';
        }).join('');
    }

    async function fcpOpenConv(convId, name, type, avatar) {
        fcpConvId = convId;
        fcpConvName = name;
        fcpConvType = type;
        _fcpUC()[convId] = 0;
        if (typeof renderChatBadge === 'function') renderChatBadge();
        fcpUpdateFloatBadge();

        document.getElementById('fcp-list-view').style.display = 'none';
        document.getElementById('fcp-conv-view').style.display = 'flex';
        document.getElementById('fcp-conv-name').textContent = name;

        var avatarEl = document.getElementById('fcp-conv-avatar');
        avatarEl.innerHTML = '';
        avatarEl.textContent = name.charAt(0).toUpperCase();

        document.getElementById('fcp-conv-status').textContent = type === 'group' ? 'Group Chat' : 'Direct Message';

        if (type === 'dm') {
            var snap = await _get(_ref('worksync/conversations/' + convId));
            if (!snap.exists()) {
                var parts = convId.replace('dm_', '').split('_');
                var myKey2 = _fcpEK(_fcpCU()?.email);
                var members2 = {};
                members2[myKey2] = true;
                parts.forEach(function(p) { members2[p] = true; });
                await _set(_ref('worksync/conversations/' + convId), { type: 'dm', members: members2, lastTimestamp: Date.now() });
            }
        }

        fcpLoadMessages(convId);
    }

    function fcpLoadMessages(convId) {
        if (fcpMsgListener) { try { fcpMsgListener(); } catch(e) {} fcpMsgListener = null; }
        var msgArea = document.getElementById('fcp-messages');
        msgArea.innerHTML = '<p style="text-align:center;font-size:10px;color:#94a3b8;padding:16px;font-style:italic;">Loading…</p>';

        var q = _query(_ref('worksync/messages/' + convId), _llast(40));
        fcpMsgListener = _onVal(q, function(snap) {
            var msgs = snap.val()
                ? Object.entries(snap.val()).map(function(e) { return Object.assign({ id: e[0] }, e[1]); })
                    .sort(function(a, b) { return (a.timestamp || 0) - (b.timestamp || 0); })
                : [];
            fcpRenderMessages(msgs);
        });
    }

    function fcpRenderMessages(msgs) {
        var el = document.getElementById('fcp-messages');
        if (!el) return;
        if (!msgs.length) {
            el.innerHTML = '<p style="text-align:center;font-size:10px;color:#94a3b8;padding:20px;font-style:italic;">No messages yet. Say hi! 👋</p>';
            return;
        }

        var isDark = document.documentElement.classList.contains('dark');

        el.innerHTML = msgs.map(function(m) {
            var isMe = m.senderEmail === (_fcpCU() && _fcpCU()?.email);
            var timeStr = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            var textHtml = m.unsent
                ? '<em style="color:#94a3b8;font-size:10px;">Message unsent</em>'
                : '<span style="font-size:11px;line-height:1.5;word-break:break-word;">' + _fcpEH(m.text || '') + '</span>';

            var allAtts = (m.attachments && m.attachments.length) ? m.attachments
                : (m.attachmentUrl ? [{ url: m.attachmentUrl, type: m.attachmentType, name: m.attachmentName }] : []);

            var attBorder = isDark ? '#334155' : '#e2e8f0';
            var attachHtml = allAtts.map(function(a) {
                if ((a.type || '').startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)/i.test(a.url || '')) {
                    return '<img src="' + a.url + '" style="max-width:180px;border-radius:8px;border:1px solid ' + attBorder + ';display:block;margin-top:4px;cursor:pointer;" onclick="typeof openImagePreview===\'function\'&&openImagePreview(\'' + a.url + '\',\'' + _fcpEH(a.name || 'Image') + '\')">';
                }
                return '<a href="' + a.url + '" target="_blank" style="font-size:10px;color:#818cf8;text-decoration:underline;display:block;margin-top:4px;">📎 ' + _fcpEH(a.name || 'File') + '</a>';
            }).join('');

            var bubbleBg, bubbleColor, bubbleBorder;
            if (isMe) {
                bubbleBg = '#4f46e5';
                bubbleColor = '#fff';
                bubbleBorder = 'none';
            } else {
                bubbleBg = isDark ? '#253347' : '#ffffff';
                bubbleColor = isDark ? '#e2e8f0' : '#1e293b';
                bubbleBorder = isDark ? '1px solid #334155' : '1px solid #e2e8f0';
            }
            var align = isMe ? 'flex-end' : 'flex-start';
            var senderColor = isDark ? '#94a3b8' : '#64748b';
            var timeColor = isDark ? '#64748b' : '#94a3b8';

            return '<div style="display:flex;flex-direction:column;align-items:' + align + ';gap:2px;">'
                + (!isMe ? '<span style="font-size:9px;font-weight:700;color:' + senderColor + ';padding:0 4px;">' + _fcpEH(m.senderName || '') + '</span>' : '')
                + '<div style="max-width:75%;background:' + bubbleBg + ';color:' + bubbleColor + ';border:' + bubbleBorder + ';border-radius:14px;' + (isMe ? 'border-top-right-radius:4px' : 'border-top-left-radius:4px') + ';padding:8px 12px;box-shadow:0 1px 3px rgba(0,0,0,.08);">'
                + (m.text || m.unsent ? textHtml : '') + attachHtml
                + '</div>'
                + '<span style="font-size:9px;color:' + timeColor + ';padding:0 4px;">' + timeStr + '</span>'
                + '</div>';
        }).join('');

        el.scrollTop = el.scrollHeight;
    }

    async function fcpSendMessage() {
        if (!fcpConvId || !_fcpCU()) return;
        var input = document.getElementById('fcp-msg-input');
        var text = input.value.trim();
        if (!text && !fcpStagedAttachments.length) return;

        try {
            var payload = { senderEmail: _fcpCU()?.email, senderName: _fcpCU()?.name, text: text, timestamp: Date.now() };
            var lastMsg = text;

            if (fcpStagedAttachments.length) {
                var attachments = [];
                for (var i = 0; i < fcpStagedAttachments.length; i++) {
                    var f = fcpStagedAttachments[i];
                    try {
                        var up = await _upload(f);
                        attachments.push(up);
                    } catch(e) {
                        attachments.push({ url: await _f2b64(f), type: f.type, name: f.name });
                    }
                }
                payload.attachments = attachments;
                if (attachments.length === 1) {
                    payload.attachmentUrl = attachments[0].url;
                    payload.attachmentType = attachments[0].type;
                    payload.attachmentName = attachments[0].name;
                }
                lastMsg = text || (attachments.length > 1 ? '📎 ' + attachments.length + ' attachments' : '📎 ' + attachments[0].name);
                fcpStagedAttachments = [];
                fcpUpdateAttachmentPreview();
            }

            await _push(_ref('worksync/messages/' + fcpConvId), payload);
            await _upd(_ref('worksync/conversations/' + fcpConvId), { lastMessage: lastMsg, lastTimestamp: Date.now() });
            input.value = '';
            input.style.height = 'auto';
        } catch(err) {
            if (typeof toast === 'function') _toast('Failed to send: ' + err.message, 'error');
        }
    }

    function fcpHandleKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fcpSendMessage(); }
    }

    function fcpHandleAttachment(event) {
        var files = Array.from(event.target.files || []);
        document.getElementById('fcp-file-input').value = '';
        files.forEach(function(f) {
            if (f.size > 10 * 1024 * 1024) { if (typeof toast === 'function') _toast(f.name + ' skipped — max 10MB', 'error'); return; }
            fcpStagedAttachments.push(f);
        });
        fcpUpdateAttachmentPreview();
    }

    function fcpUpdateAttachmentPreview() {
        var preview = document.getElementById('fcp-attachment-preview');
        var list = document.getElementById('fcp-attachment-list');
        if (!preview || !list) return;
        if (!fcpStagedAttachments.length) { preview.style.display = 'none'; list.innerHTML = ''; return; }
        preview.style.display = 'block';
        list.innerHTML = fcpStagedAttachments.map(function(f, i) {
            return '<div style="position:relative;display:inline-block;">'
                + '<span style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:3px 8px;font-size:10px;color:#475569;font-weight:700;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + _fcpEH(f.name) + '</span>'
                + '<button onclick="fcpRemoveAttachment(' + i + ')" style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:#ef4444;color:#fff;border:none;border-radius:50%;font-size:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>'
                + '</div>';
        }).join('');
    }

    function fcpRemoveAttachment(i) {
        fcpStagedAttachments.splice(i, 1);
        fcpUpdateAttachmentPreview();
    }

    function floatChatBack() {
        if (fcpMsgListener) { try { fcpMsgListener(); } catch(e) {} fcpMsgListener = null; }
        fcpConvId = null;
        fcpStagedAttachments = [];
        fcpUpdateAttachmentPreview();
        document.getElementById('fcp-conv-view').style.display = 'none';
        document.getElementById('fcp-list-view').style.display = 'flex';
        fcpRenderList();
    }

    function fcpUpdateFloatBadge() {
        var total = _fcpUC() ? Object.values(_fcpUC()).reduce(function(s, c) { return s + (c || 0); }, 0) : 0;
        var badge = document.getElementById('float-chat-badge');
        if (!badge) return;
        badge.textContent = total;
        badge.style.display = total > 0 ? 'block' : 'none';
    }

    // Hook renderChatBadge to also update float badge
    (function() {
        var _orig = window.renderChatBadge;
        if (typeof _orig === 'function') {
            window.renderChatBadge = function() {
                _orig();
                fcpUpdateFloatBadge();
                if (fcpOpen && !fcpConvId) fcpRenderList();
            };
        }
    })();

    // Patch switchView to hide bubble on chat page
    (function patchSV() {
        if (typeof window.switchView === 'function') {
            var _orig = window.switchView;
            window.switchView = function(view) {
                _orig(view);
                var btn = document.getElementById('float-chat-btn');
                if (!btn || btn.style.display === 'none') return;
                if (view === 'chat') {
                    btn.style.display = 'none';
                    if (fcpOpen) toggleFloatChat();
                } else {
                    btn.style.display = 'flex';
                }
            };
        } else {
            setTimeout(patchSV, 300);
        }
    })();

    window.toggleFloatChat     = toggleFloatChat;
    window.switchFloatTab      = switchFloatTab;
    window.fcpOpenConv         = fcpOpenConv;
    window.fcpSendMessage      = fcpSendMessage;
    window.fcpHandleKey        = fcpHandleKey;
    window.fcpHandleAttachment = fcpHandleAttachment;
    window.fcpRemoveAttachment = fcpRemoveAttachment;
    window.floatChatBack       = floatChatBack;
    window.showFloatBtn        = showFloatBtn;
    window.hideFloatBtn        = hideFloatBtn;
    
