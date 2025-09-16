from flask import Flask, render_template

# Flaskアプリケーションを初期化
app = Flask(__name__)


# ルートURL ('/') にアクセスがあった場合に呼ばれる関数
@app.route('/')
def index():
  """
    メインページを表示します。
    'index.html'をレンダリングしてユーザーに返します。
    """
  return render_template('index.html')


# スクリプトが直接実行された場合にサーバーを起動
if __name__ == '__main__':
  # Replit環境で動作するように設定
  app.run(host='0.0.0.0', port=80)
