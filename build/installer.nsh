!macro customInit
  ; Require admin to install properly (register uninstaller, create shortcuts)
  UserInfo::GetAccountType
  Pop $0
  ${if} $0 != "admin"
    MessageBox MB_ICONSTOP "安装需要管理员权限。请右键点击安装程序，选择'以管理员身份运行'。"
    Quit
  ${endif}
!macroend
