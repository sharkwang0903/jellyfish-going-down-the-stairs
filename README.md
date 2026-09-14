# Jellyfish Going Down the Stairs

一款公司官網使用的純前端 2D 小遊戲。玩家操控可愛水母，在持續向上捲動的深藍洞穴中往下探索，閃避尖刺並管理生命值，挑戰能抵達的最深樓層。

目前版本是核心遊戲雛型，使用 HTML、CSS 與原生 JavaScript 製作，不需要安裝套件，也沒有建置流程或後端服務。

## 快速開始

1. 保持專案目錄與 `assets/`、`js/` 的相對位置不變。
2. 直接以瀏覽器開啟 `index.html`。
3. 等待圖片素材載入完成後，按下「開始遊戲」。

遊戲不需要 npm、Node.js、Webpack、Vite 或第三方遊戲引擎。建議使用最新版 Chrome、Edge、Firefox 或 Safari。

## 操作方式

| 按鍵 | 動作 |
| --- | --- |
| `←` | 水母向左移動 |
| `→` | 水母向右移動 |
| 放開方向鍵 | 立即停止水平移動 |

角色不能跳躍。玩家必須左右移動，讓水母從上方落到下一個平台。

目前版本只支援鍵盤操作，不包含手機觸控控制。

## 遊戲規則

- 遊戲使用固定的 `400 × 600` 虛擬座標，網頁只負責等比例縮放顯示，因此不同螢幕尺寸下的物理與難度一致。
- 所有平台持續向上移動；玩家站在平台上時會跟著平台一起移動。
- 玩家離開平台邊緣後會重新受重力影響並向下墜落。
- 玩家碰到頂部尖刺時會被強制打下，即使正處於無敵時間也一樣。
- 生命值降至 0，或玩家整體掉出畫面下方時，遊戲結束。
- 最高樓層使用 `localStorage` 保存，重新整理頁面後仍會保留。

### 生命值

| 事件 | 效果 |
| --- | --- |
| 成功落到普通平台 | `HP + 1`，不超過 10 |
| 成功落到破碎平台 | `HP + 1`，並開始破碎倒數 |
| 成功落到尖刺平台 | `HP - 4` |
| 碰到頂部尖刺 | 非無敵時 `HP - 4`，並且一定會被打下 |

回血與尖刺平台傷害都只在成功 landing 的瞬間觸發，不會因為持續站在平台上而每幀重複計算。

玩家受到尖刺傷害後有 1 秒無敵時間。無敵只會阻止傷害，不會取消頂部尖刺的擊落效果。

## 平台類型

### Normal／普通平台

- 使用 `assets/platform-normal.png`。
- 成功落地時回復 1 HP。
- 持續支撐玩家，直到玩家離開或平台移出遊戲區。

### Spike／尖刺平台

- 使用完整素材 `assets/platform-spike.png`。
- 成功落地時造成 4 點傷害，不回血。
- 同一次 landing 只判定一次傷害。

### Breakable／破碎平台

- 未觸發時使用 `assets/platform-breakable-idle.png`。
- 第一次成功 landing 後回復 1 HP，並立即啟動 0.3 秒破碎倒數。
- 倒數期間仍然可以碰撞、支撐玩家，並跟著世界向上捲動。
- 玩家提前離開不會暫停或重置倒數。
- 倒數結束後平台失效並移除；若玩家仍站在上面，會解除站立狀態並自然受重力掉落，不會瞬移或獲得額外向下速度。

### Conveyor／傳送帶平台

- `conveyor-left` 與 `conveyor-right` 共用 `assets/conveyor-base.png`、`assets/conveyor-belt-strip.png` 兩張素材。
- 成功落地時回復 1 HP；其餘非尖刺平台的共通回血規則不變。
- 只有玩家真正站在傳送帶上時才會套用傳送帶水平公式；離開平台、掉落或被擊落後立即恢復一般移動。
- 沒有方向輸入時，角色會依帶面方向以 `CONVEYOR_IDLE_DRIFT` 漂移。
- 輸入方向與帶面相同時，水平速度為 `MOVE_SPEED × CONVEYOR_SAME_DIRECTION_MULTIPLIER`；輸入相反時則為 `MOVE_SPEED × CONVEYOR_OPPOSITE_DIRECTION_MULTIPLIER`。
- 帶面動畫速度與物理速度分離：`CONVEYOR_VISUAL_SPEED` 只控制帶面捲動，不會影響玩家移動。
- belt strip 會在底座中央槽內循環平鋪，固定底座繪製於上層，避免帶面超出外框。

破碎動畫使用 `BREAKABLE_LIFETIME / 3` 作為每階段時間：

| 時間 | 狀態 | 素材 |
| --- | --- | --- |
| 未觸發 | `idle` | `platform-breakable-idle.png` |
| 0.0～0.1 秒 | `cracking1` | `platform-breakable-cracked-1.png` |
| 0.1～0.2 秒 | `cracking2` | `platform-breakable-cracked-2.png` |
| 0.2～0.3 秒 | `breaking` | `platform-breakable-breaking.png` |
| 0.3 秒後 | `gone` | 平台移除 |

## 樓層與捲動速度

`worldDepth` 代表世界累積向上捲動的總距離：

```js
worldDepth += scrollSpeed * dt;
floor = Math.floor(worldDepth / FLOOR_HEIGHT) + 1;
```

目前 `FLOOR_HEIGHT` 為 600，也就是完整捲動一個遊戲視窗高度才增加一層：

- `worldDepth 0～599`：B1
- `worldDepth 600～1199`：B2
- `worldDepth 1200～1799`：B3

平台速度每 10 樓階梯式提高：

```js
speedLevel = Math.floor((floor - 1) / FLOORS_PER_SPEED_UP);
scrollSpeed = Math.min(
  MAX_SCROLL_SPEED,
  INITIAL_SCROLL_SPEED + speedLevel * SPEED_STEP
);
```

目前速度設定：

- B1～B10：75
- B11～B20：85
- B21～B30：95
- 之後每 10 樓增加 10
- 最大速度：255

## Landing collision

玩家只能在向下墜落時站上平台。一次合法 landing 必須同時符合：

1. 玩家目前垂直速度 `vy > 0`。
2. 上一幀玩家腳底位於平台上一幀頂面上方。
3. 這一幀玩家腳底穿越平台目前頂面。
4. 玩家 hitbox 與平台在水平方向有重疊。

判定同時使用玩家與平台的前一幀位置，避免高速下落穿透。從側面擦過或從平台下方穿越都不會觸發站立、回血、傷害或破碎。

## 平台生成與可達性

平台生成器會先從上一個路徑平台建立下一個可達平台，再加入隨機變化：

- 垂直間距介於 40～140，大部分落在 60～110。
- 使用小型逐幀模擬計算玩家下落與平台上移相遇所需的時間。
- 以 `MOVE_SPEED × fallTime × SAFE_REACH_FACTOR` 計算安全水平距離。
- 水平判斷使用兩個平台可供玩家站立的範圍，不只比較平台中心點。
- Breakable 與 Normal 使用相同的可達性條件。
- 從 Conveyor 離開時，安全水平距離會依順向／逆向倍率調整，避免反向傳送帶令保底路徑過度極限。
- 若指定間距沒有可達位置，生成器會使用偏好的安全間距再次嘗試，並保留安全的水平位置備援。

在安全規則沒有介入時，五種平台的基礎抽選機率相同：

```text
normal          1/5
spike           1/5
breakable       1/5
conveyor-left   1/5
conveyor-right  1/5
```

既有安全規則仍可覆寫基礎抽選，例如初始安全平台、禁止連續尖刺，以及確保一定距離內重新出現普通平台。因此長期實際統計比例不保證精確各占五分之一。

## 專案結構

```text
jellyfish-going-down-the-stairs/
├─ index.html          首頁、HUD、Canvas 與 Game Over 結構
├─ style.css           網頁版面、響應式縮放與復古像素風格
├─ README.md           專案說明文件
├─ assets/             遊戲圖片素材
└─ js/
   ├─ config.js        所有可調參數與素材路徑
   ├─ physics.js       hitbox、landing 與平台可達性計算
   ├─ player.js        玩家移動、生命、無敵與站立狀態
   ├─ platforms.js     平台生成、移動、破碎／傳送帶狀態與清理
   ├─ ui.js            首頁、HUD、最高紀錄與 Game Over 顯示
   ├─ game.js          主迴圈、遊戲狀態、landing 效果與 Canvas 渲染
   └─ main.js          初始化、按鈕與鍵盤事件綁定
```

JavaScript 透過 `window.JellyfishGame` 共用命名空間，載入順序定義在 `index.html`。`main.js` 必須最後載入。

## 使用中的圖片素材

| 用途 | 檔案 |
| --- | --- |
| 洞穴背景 | `assets/cave-background.png` |
| 左右洞穴岩壁 | `assets/cave-wall.png` |
| 水母停止／下落 | `assets/jellyfish-idle.png` |
| 水母移動 | `assets/jellyfish-move-right.png`；向左時程式水平鏡像 |
| 水母受傷 | `assets/jellyfish-hurt.png` |
| 普通平台 | `assets/platform-normal.png` |
| 尖刺平台 | `assets/platform-spike.png` |
| 破碎平台 | 四張 `platform-breakable-*.png` |
| 傳送帶平台 | `assets/conveyor-base.png`、`assets/conveyor-belt-strip.png` |
| 頂部尖刺 | `assets/ceiling-spikes.png` |

Canvas 渲染時停用圖片平滑處理，以保留偽像素風格。

## 重要參數

所有容易調整的遊戲參數都集中在 `js/config.js`：

| 分類 | 主要參數 |
| --- | --- |
| 畫面 | `GAME_WIDTH`、`GAME_HEIGHT` |
| 玩家 | `PLAYER_*`、`MOVE_SPEED`、`GRAVITY`、`MAX_FALL_SPEED` |
| 平台 | `PLATFORM_*`、`MIN_PLATFORM_GAP`、`MAX_PLATFORM_GAP` |
| 可達性 | `SAFE_REACH_FACTOR`、`REACH_SIMULATION_*` |
| 破碎平台 | `BREAKABLE_LIFETIME` |
| 傳送帶 | `CONVEYOR_IDLE_DRIFT`、`CONVEYOR_SAME_DIRECTION_MULTIPLIER`、`CONVEYOR_OPPOSITE_DIRECTION_MULTIPLIER`、`CONVEYOR_VISUAL_SPEED`、`CONVEYOR_BELT_*` |
| 生命 | `MAX_HP`、`NORMAL_HEAL`、`SPIKE_DAMAGE`、`INVINCIBLE_TIME` |
| 捲動 | `INITIAL_SCROLL_SPEED`、`SPEED_STEP`、`MAX_SCROLL_SPEED` |
| 樓層 | `FLOOR_HEIGHT`、`FLOORS_PER_SPEED_UP` |
| 生成安全 | `PLATFORM_TYPES`、`MAX_CONSECUTIVE_SPIKES`、`MAX_DEPTH_WITHOUT_NORMAL_PLATFORM` |
| 頂部尖刺 | `TOP_SPIKE_HEIGHT`、`TOP_KNOCKDOWN_SPEED` |
| 素材 | `ASSETS` |

調整遊戲手感時應優先修改 `config.js`，避免把數值散落到其他模組。

## 儲存資料

最高紀錄保存在目前網域的瀏覽器 `localStorage`：

```text
jellyfish-going-down-best-floor-v2
```

瀏覽器封鎖儲存功能時，遊戲仍可正常執行，但最高紀錄可能無法跨次保存。直接開啟本機檔案時，不同瀏覽器對本機 `localStorage` 的隔離方式可能不同。

## 手動測試建議

修改遊戲後，至少確認以下項目：

1. 按住與放開左右鍵時，角色固定速度移動並立即停止。
2. 角色只會從上方落到平台，不會因側撞或由下穿越而 landing。
3. 玩家站立時會跟著平台上升，離開邊緣後重新下落。
4. Normal、Breakable 與 Conveyor 每次 landing 只回血一次；Spike 每次 landing 只傷害一次。
5. Breakable 依序播放三個破碎階段，0.3 秒後消失並讓玩家自然掉落。
6. Conveyor 只在站立時推動玩家；離開邊緣、掉落或被頂部尖刺打下後，推力立即停止。
7. Conveyor belt strip 在底座中央槽內連續循環，左右方向分別以相反方向捲動。
8. 無敵期間不重複受傷，但碰到頂部尖刺仍會被打下。
9. 樓層、加速、Game Over 與最高紀錄顯示一致。
10. 重新整理頁面後最高紀錄仍存在。

## 維護原則

- 保持純 HTML、CSS、原生 JavaScript。
- 不需要引入套件管理器或建置工具。
- 新增平台類型時，優先沿用既有 landing 與可達性流程，只在 `platforms.js` 管理平台狀態，在 `game.js` 處理 landing 效果與渲染。
- 新增可調數值時集中放入 `config.js`，不要散布 magic numbers。
- 圖片素材維持在 `assets/`，並透過 `CONFIG.ASSETS` 登錄。
