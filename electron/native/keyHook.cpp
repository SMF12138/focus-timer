#include <napi.h>
#include <windows.h>

HHOOK hHook = NULL;
bool blocking = false;

LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
  if (nCode < 0 || !blocking) {
    return CallNextHookEx(NULL, nCode, wParam, lParam);
  }

  KBDLLHOOKSTRUCT* p = (KBDLLHOOKSTRUCT*)lParam;
  DWORD vk = p->vkCode;
  bool alt = (p->flags & LLKHF_ALTDOWN) != 0;
  bool ctrl = (GetAsyncKeyState(VK_CONTROL) & 0x8000) != 0;
  bool shift = (GetAsyncKeyState(VK_SHIFT) & 0x8000) != 0;

  // Allow Ctrl+Shift+E to pass through
  if (ctrl && shift && vk == 0x45) {
    return CallNextHookEx(NULL, nCode, wParam, lParam);
  }

  // Block Alt+Tab, Alt+Esc, Alt+F4
  if (alt && (vk == VK_TAB || vk == VK_ESCAPE || vk == VK_F4)) {
    return 1;
  }

  // Block Windows keys (LWin / RWin)
  if (vk == VK_LWIN || vk == VK_RWIN) {
    return 1;
  }

  // Block Ctrl+Esc (Start menu)
  if (vk == VK_ESCAPE && ctrl) {
    return 1;
  }

  return CallNextHookEx(NULL, nCode, wParam, lParam);
}

Napi::Value StartHook(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  blocking = true;
  if (!hHook) {
    HINSTANCE hInst = GetModuleHandle(NULL);
    hHook = SetWindowsHookEx(WH_KEYBOARD_LL, LowLevelKeyboardProc, hInst, 0);
  }
  return Napi::Boolean::New(env, hHook != NULL);
}

Napi::Value StopHook(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  blocking = false;
  if (hHook) {
    UnhookWindowsHookEx(hHook);
    hHook = NULL;
  }
  return Napi::Boolean::New(env, true);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("startHook", Napi::Function::New(env, StartHook));
  exports.Set("stopHook", Napi::Function::New(env, StopHook));
  return exports;
}

NODE_API_MODULE(keyHook, Init)
