# Flaskフレームワークから必要な機能をインポート
from flask import Flask, render_template

# Flaskアプリケーションのインスタンスを作成
app = Flask(__name__)

# --- ルーティング定義 ---
# WebサイトのルートURL ('/') にアクセスがあった場合に実行される関数
@app.route('/')
def index():
    """
    メインページを表示します。
    'templates'フォルダ内の'index.html'を読み込み、
    ブラウザに表示させるためのHTMLコンテンツとして返却します。
    """
    return render_template('index.html')

# --- サーバー起動 ---
# このスクリプトが直接実行された場合にのみ、以下のコードが実行される
if __name__ == '__main__':
    """
    開発用のWebサーバーを起動します。
    Replit環境で外部からアクセスできるように、host='0.0.0.0'に設定しています。
    """
    app.run(host='0.0.0.0', port=80)

