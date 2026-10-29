package com.anping.cardagent

import android.content.Context
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.ViewConfiguration
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import kotlin.math.abs

class ClinicSwipeRefreshLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : SwipeRefreshLayout(context, attrs) {
    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
    private var startX = 0f
    private var startY = 0f
    private var allowPull = false
    private var pullStarted = false

    override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                startX = event.x
                startY = event.y
                allowPull = true
                pullStarted = false
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = event.x - startX
                val dy = event.y - startY
                // Once scrolling up or dragging sideways, never turn this gesture into a refresh.
                if (dy < -touchSlop || (abs(dx) > touchSlop && abs(dx) > abs(dy))) {
                    allowPull = false
                }
                if (allowPull && !pullStarted) {
                    if (dy <= touchSlop || abs(dy) <= abs(dx)) return false
                    if (canChildScrollUp()) {
                        allowPull = false
                        return false
                    }
                    // JS may report the scroll position after DOWN; initialize with the original origin.
                    val down = MotionEvent.obtain(event)
                    down.action = MotionEvent.ACTION_DOWN
                    down.setLocation(startX, startY)
                    super.onInterceptTouchEvent(down)
                    down.recycle()
                    pullStarted = true
                }
            }
            MotionEvent.ACTION_POINTER_DOWN -> allowPull = false
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                val intercepted = if (allowPull) super.onInterceptTouchEvent(event) else false
                allowPull = false
                return intercepted
            }
        }
        return allowPull && super.onInterceptTouchEvent(event)
    }
}
