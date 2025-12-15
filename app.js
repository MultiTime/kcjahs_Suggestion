const firebaseConfig = {
            apiKey: "AIzaSyAoGGM7daU7iXqn1N4dKK1zpyUnOTsy6i0",
            authDomain: "kcjahs-suggection.firebaseapp.com",
            projectId: "kcjahs-suggection",
            storageBucket: "kcjahs-suggection.firebasestorage.app",
            messagingSenderId: "680058871961",
            appId: "1:680058871961:web:6931fb143e6d1ce2a8d808",
            measurementId: "G-M84BJH4Z8P"
        };

        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // 로딩 화면 토글
        function toggleLoading(show) {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) overlay.style.display = show ? 'flex' : 'none';
        }

        window.onload = function() {
            // 필드 초기화
            document.querySelector('.title-input').value = '';
            document.querySelector('.content-textarea').value = '';
            document.querySelector('.category-select').value = '';
            document.getElementById('anonymous').checked = false;

            auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log("로그인 됨");
                    document.getElementById('loginSection').style.display = 'none';
                    document.getElementById('userInfo').classList.add('active');
                    document.getElementById('userName').textContent = user.email.split('@')[0];
                    document.getElementById('userClass').textContent = '로그인 성공';
                    renderSuggestionLists();
                } else {
                    console.log("로그아웃 됨");
                    document.getElementById('loginSection').style.display = 'block';
                    document.getElementById('userInfo').classList.remove('active');
                }
            });
        };

        async function handleSignUp() {
            const id = document.getElementById('studentId').value;
            const pw = document.getElementById('password').value;
            if (!id || !pw) return alert("학번과 비밀번호를 모두 입력해주세요.");
            toggleLoading(true);
            try {
                await auth.createUserWithEmailAndPassword(id + '@kimcheon.hs', pw);
                alert('회원가입 완료!');
            } catch (e) {
                alert("회원가입 실패: " + e.message);
            } finally {
                toggleLoading(false);
            }
        }

        async function handleLogin() {
            const id = document.getElementById('studentId').value;
            const pw = document.getElementById('password').value;
            if (!id || !pw) return alert("입력해주세요.");
            toggleLoading(true);
            try {
                await auth.signInWithEmailAndPassword(id + '@kimcheon.hs', pw);
            } catch (e) {
                alert("로그인 실패: " + e.message);
            } finally {
                toggleLoading(false);
            }
        }

        function handleLogout() {
            auth.signOut();
            document.querySelector('.pending-list').innerHTML = '';
            document.querySelector('.completed-list').innerHTML = '';
            alert("로그아웃 되었습니다.");
        }

        async function submitSuggestion() {
            const user = auth.currentUser;
            if (!user) return alert('로그인 후 이용해 주세요.');

            const title = document.querySelector('.title-input').value.trim();
            const content = document.querySelector('.content-textarea').value.trim();
            const category = document.querySelector('.category-select').value;
            const anon = document.getElementById('anonymous').checked;

            if (!category || !title || !content) return alert('모든 항목을 입력해주세요.');

            toggleLoading(true);
            try {
                await db.collection('suggestions').add({
                    uid: user.uid,
                    authorId: anon ? '익명' : user.email.split('@')[0],
                    title, content, category,
                    date: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'pending',
                    anonymous: anon
                });

                document.querySelector('.title-input').value = '';
                document.querySelector('.content-textarea').value = '';
                document.querySelector('.category-select').value = '';
                document.getElementById('anonymous').checked = false;
                alert('제출 완료!');
            } catch (e) {
                alert('제출 실패: ' + e.message);
            } finally {
                toggleLoading(false);
            }
        }

        // 목록 렌더링
        function renderSuggestionLists() {
            const pendingEl = document.querySelector('.pending-list');
            const completedEl = document.querySelector('.completed-list');

            toggleLoading(true);

            db.collection('suggestions')
                .orderBy('date', 'desc')
                .onSnapshot(snapshot => {
                    pendingEl.innerHTML = '';
                    completedEl.innerHTML = '';

                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const dateObj = data.date ? data.date.toDate() : new Date();
                        const dateStr = dateObj.toISOString().split('T')[0];
                        const docId = doc.id;

                        const el = document.createElement('div');
                        el.className = 'suggestion-item';

                        // 클릭 시 내용 보기
                        el.onclick = function() {
                            alert(`[${data.category}]\n제목: ${data.title}\n내용: ${data.content}`);
                        };

                        let actionButtons = '';
                        // 수정/삭제 버튼: 본인 글일 경우만 표시
                        if (auth.currentUser && data.uid === auth.currentUser.uid) {
                            actionButtons = `
                                <div class="item-actions">
                                    <button class="action-btn btn-edit" onclick="event.stopPropagation(); editSuggestion('${docId}')">수정</button>
                                    <button class="action-btn btn-delete" onclick="event.stopPropagation(); deleteSuggestion('${docId}')">삭제</button>
                                </div>
                            `;
                        }

                        el.innerHTML = `
                            <div class="suggestion-title">[${data.category}] ${data.title}</div>
                            <div class="suggestion-date">
                                <span class="status-badge ${data.status === 'completed' ? 'status-completed' : 'status-pending'}">
                                    ${data.status === 'completed' ? '완료' : '검토중'}
                                </span>
                                ${dateStr} | ${data.anonymous ? '익명' : (data.authorId || '학생')}
                            </div>
                            ${actionButtons}
                        `;

                        if (data.status === 'completed') completedEl.appendChild(el);
                        else pendingEl.appendChild(el);
                    });
                    toggleLoading(false);
                }, (error) => {
                    console.error("Error:", error);
                    toggleLoading(false);
                });
        }

        // 검색 기능
        function searchSuggestions(keyword) {
            const items = document.querySelectorAll('.suggestion-item');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(keyword.toLowerCase()) ? 'block' : 'none';
            });
        }

        // 삭제 기능
        async function deleteSuggestion(docId) {
            if(!confirm("정말 삭제하시겠습니까?")) return;
            try {
                await db.collection('suggestions').doc(docId).delete();
                alert("삭제되었습니다.");
            } catch(e) {
                alert("삭제 실패: " + e.message);
            }
        }

        // 수정 기능
        async function editSuggestion(docId) {
            const newTitle = prompt("수정할 제목을 입력하세요:");
            if(newTitle === null) return;

            const newContent = prompt("수정할 내용을 입력하세요:");
            if(newContent === null) return;

            if(!newTitle || !newContent) return alert("내용을 입력해주세요.");

            try {
                await db.collection('suggestions').doc(docId).update({
                    title: newTitle,
                    content: newContent
                });
                alert("수정되었습니다.");
            } catch(e) {
                alert("수정 실패: " + e.message);
            }
        }