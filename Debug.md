too many request as always: 
critical:學年logic未搞好

1. 登入
- Login fine (done)
- 要整好register同valid code (removed right now)

2. 學校
- school adding fine，學校資訊css有bug (最底) (done)
- 更改，有些資料不能改（學校type）(done)
- 無法改學校right now (done)
- 無法刪除學校 (done)


3.學生
- user: 班號會變成3？in create form (not sure)
- 學生首面編輯無法使用 (done)
- 學生無法編輯學號 (done)
- 無法刪除學生 (done)

4.學生報告記錄
- 學生報告記錄：filter會找到其他年級的學生 (done)
- 學生報告記錄 css 內容要做 （pending)
- 記錄詳情，編輯，刪除頁（要做） (done)
- 增加鎖定學生，不用每次重覆 (pending)
- 

5. 會議紀錄
- css 要重整
- 學生學號亂了 (fixed filter )
- 可以加確定按鈕讓user加老師名
- 無法看到個別記錄 (done)
- 無法看到記錄了。。。(done)

http://localhost:3000/meetings/688e682111dd27fc183c14c9

Uncaught TypeError: Cannot read properties of undefined (reading 'includes')
    at MeetingRecordForm.jsx:345:51
    at Array.map (<anonymous>)
    at MeetingRecordForm (MeetingRecordForm.jsx:341:28)
    at renderWithHooks (chunk-NXESFFTV.js?v=10b390f6:11596:26)
    at updateFunctionComponent (chunk-NXESFFTV.js?v=10b390f6:14630:28)
    at beginWork (chunk-NXESFFTV.js?v=10b390f6:15972:22)
    at HTMLUnknownElement.callCallback2 (chunk-NXESFFTV.js?v=10b390f6:3680:22)
    at Object.invokeGuardedCallbackDev (chunk-NXESFFTV.js?v=10b390f6:3705:24)
    at invokeGuardedCallback (chunk-NXESFFTV.js?v=10b390f6:3739:39)
    at beginWork$1 (chunk-NXESFFTV.js?v=10b390f6:19818:15)

- IEP css 混亂 (done)

6. 年度整理
- 確定按鈕走位 
- 沒法升級，按扭不正常

7. 報告
- filter會找到其他年級的學生 (done)

8. AI
- 無法加入一次太多學生（用20位沒有成功加入）
- 性別css 縮少會走位


額外：設定改密碼，個人file