// 1. Firebase 설정
        const firebaseConfig = {
            apiKey: "AIzaSyAoGGM7daU7iXqn1N4dKK1zpyUnOTsy6i0",
            authDomain: "kcjahs-suggection.firebaseapp.com",
            projectId: "kcjahs-suggection",
            storageBucket: "kcjahs-suggection.firebasestorage.app",
            messagingSenderId: "680058871961",
            appId: "1:680058871961:web:6931fb143e6d1ce2a8d808",
            measurementId: "G-M84BJH4Z8P"
        };

        // 2. Firebase 초기화
        firebase.initializeApp(firebaseConfig);
        
        const auth = firebase.auth();
        const db = firebase.firestore();

        // 3. 페이지 로드 시 초기화 작업
        window.onload = function() {
            // 입력 필드 초기화
            const titleInput = document.querySelector('.title-input');
            if(titleInput) titleInput.value = '';
            
            const contentArea = document.querySelector('.content-textarea');
            if(contentArea) contentArea.value = '';
            
            const catSelect = document.querySelector('.category-select');
            if(catSelect) catSelect.value = '';
            
            const anonCheck = document.getElementById('anonymous');
            if(anonCheck) anonCheck.checked = false;

            // 로그인 상태 감지
            auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log("로그인 됨:", user.email);
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

        // 4. 회원가입 함수
        async function handleSignUp() {
            const id = document.getElementById('studentId').value;
            const pw = document.getElementById('password').value;

            if (!id || !pw) {
                alert("학번과 비밀번호를 모두 입력해주세요.");
                return;
            }

            try {
                await auth.createUserWithEmailAndPassword(id + '@kimcheon.hs', pw);
                alert('회원가입 완료! 자동으로 로그인됩니다.');
            } catch (e) {
                let msg = "회원가입 실패: ";
                if(e.code === 'auth/email-already-in-use') msg += "이미 가입된 학번입니다.";
                else if(e.code === 'auth/weak-password') msg += "비밀번호는 6자리 이상이어야 합니다.";
                else msg += e.message;
                alert(msg);
            }
        }

        // 5. 로그인 함수
        async function handleLogin() {
            const id = document.getElementById('studentId').value;
            const pw = document.getElementById('password').value;

            if (!id || !pw) {
                alert("학번과 비밀번호를 입력해주세요.");
                return;
            }

            try {
                await auth.signInWithEmailAndPassword(id + '@kimcheon.hs', pw);
            } catch (e) {
                let msg = "로그인 실패: ";
                if(e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
                    msg += "학번 또는 비밀번호가 잘못되었습니다.";
                } else {
                    msg += e.message;
                }
                alert(msg);
            }
        }

        // 6. 로그아웃 함수
        function handleLogout() {
            auth.signOut();
            const pendingEl = document.querySelector('.pending-list');
            const completedEl = document.querySelector('.completed-list');
            if (pendingEl) pendingEl.innerHTML = '';
            if (completedEl) completedEl.innerHTML = '';
            alert("로그아웃 되었습니다.");
        }

        // 7. 건의 제출 함수
        async function submitSuggestion() {
            const user = auth.currentUser;
            if (!user) {
                alert('로그인 후 이용해 주세요.');
                return;
            }

            const title = document.querySelector('.title-input').value.trim();
            const content = document.querySelector('.content-textarea').value.trim();
            const category = document.querySelector('.category-select').value;
            const anon = document.getElementById('anonymous').checked;

            if (!category) return alert('카테고리를 선택해주세요.');
            if (!title) return alert('제목을 입력해주세요.');
            if (!content) return alert('내용을 입력해주세요.');

            try {
                await db.collection('suggestions').add({
                    uid: user.uid,
                    authorId: anon ? '익명' : user.email.split('@')[0], 
                    title: title,
                    content: content,
                    category: category,
                    date: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'pending',
                    anonymous: anon
                });
                
                document.querySelector('.title-input').value = '';
                document.querySelector('.content-textarea').value = '';
                document.querySelector('.category-select').value = '';
                document.getElementById('anonymous').checked = false;
                
                alert('건의가 성공적으로 제출되었습니다!');
            } catch (e) {
                console.error(e);
                alert('제출 실패: ' + e.message);
            }
        }

        // 8. 목록 렌더링
        function renderSuggestionLists() {
            const pendingEl = document.querySelector('.pending-list');
            const completedEl = document.querySelector('.completed-list');

            db.collection('suggestions')
                .orderBy('date', 'desc')
                .onSnapshot(snapshot => {
                    pendingEl.innerHTML = '';
                    completedEl.innerHTML = '';

                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const dateObj = data.date ? data.date.toDate() : new Date();
                        const dateStr = dateObj.toISOString().split('T')[0];
                        
                        const el = document.createElement('div');
                        el.className = 'suggestion-item';
                        
                        el.onclick = function() {
                            alert(`[${data.category}]\n제목: ${data.title}\n내용: ${data.content}`);
                        };

                        el.innerHTML = `
                            <div class="suggestion-title">
                            [${data.category}] ${data.title}
                            </div>
                            <div class="suggestion-date">
                                ${dateStr} | ${data.anonymous ? '익명' : (data.authorId || '학생')}
                                <span class="status-badge ${data.status === 'completed' ? 'status-completed' : 'status-pending'}">
                                    ${data.status === 'completed' ? '완료' : '검토중'}
                                </span>
                            </div>`;

                        if (data.status === 'completed') {
                            completedEl.appendChild(el);
                        } else {
                            pendingEl.appendChild(el);
                        }
                    });
                }, (error) => {
                    console.error("데이터 불러오기 실패:", error);
                });
        }

        // 9. 수정 기능(개발자님 추가)
        if (data.uid === auth.currentUser.uid) {
          el.innerHTML += <button onclick="editSuggestion('${doc.id}')">수정</button>;
        }

        // 10. 검색창 추가 기능(개발자님 추가)
        function searchSuggestions(keyword) {
          const items = document.querySelectorAll('.suggestion-item'); items.forEach(item => {
            const text = item.textContent.toLowerCase(); item.style.display = text.includes(keyword.toLowerCase()) ? 'block' : 'none';
          });

        // 11. 로딩화면 기능(개발자님 추가)
        function showLoading() { document.body.innerHTML +=
          `로딩 중...`