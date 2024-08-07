---
title: Rust for Rustaceans - Chapter-1 基石
description: 阅读 Rust for Rustaceans 的记录，第一章。
slug: rfr-fundations
date: 2024-05-17 00:00:00+0000
image: 
categories:
    - rust
    - techs
    - unfinished
tags: 
weight: 1       # You can add weight to some posts to override the default sorting (date descending)
comments: false
---

本系列博客并不是书《Rust for Rustaceans》的全文翻译，不保证内容准确，仅作为个人阅读后的学习记录。

支持正版：[Rust for Rustaceans by Jon Gjengset (rust-for-rustaceans.com)](https://rust-for-rustaceans.com/)

作者油管：[Jon Gjengset - YouTube](https://www.youtube.com/@jonhoo)

# 第一章 — 基石

Rust 中的各种概念非常重要，所以有必要保证你的基础坚挺。

这一章会讨论变量、值、所有权、借用、生命周期等等，你需要完全了解后才能继续深入本书。

## 内存

内存的每个部分并不相同，在多数语言环境下，你的程序都会访问：栈、堆、寄存器、text segments、memory-mapped 寄存器，memory-mapped 文件，还有 non volatile RAM。

### 内存术语

在深入了解各个内存区域之前，首先需要知道值、变量、指针的区别。在 Rust 中，**值**是类型和这个类型值域中的元素的结合。值可以被转换为使用某种类型代表的字节序列。

例如，6u8，就代表整数 6，以及内存中的字节是 0x06. 值跟变量存储的地址是无关的。

值需要存储在一个地方，不管是栈还是堆，最常见的存储值的地方叫做 **变量**，栈上的一个 slot。

指针存储了某个内存区域的地址值，所以指针指向一个地方，指针通过解引用可以访问其存储的地址值中的值。可以拥有多个指向同一块内存的指针变量。

```rust
let x = 42;
let y = 43;
let var1 = &x;
let mut var2 = &x;
var2 = &y;
```

值：42、43、x的地址、y的地址

变量：x，y，var1，var2

与普通的变量不同的是字符串变量

```rust
let string = "Hello World";
```

`string` 存储的还是一个指针，虽然看似我们把字符串字面量赋值给它了。但关于 `string` 实际指向了谁，以后再说。

---

### 深入理解变量

之前给出的变量的定义可能确实没什么用，更重要的是你需要有一个更准确的 mental model 来帮助你理解程序的行为。有很多种模型，但总得来说，分两种 —— High-level models 和 Low-level models。High-level models 在你讨论代码本身时更有用，比如讨论生命周期、借用等。Low-level 模型在你使用 unsafe 时有用，比如使用裸指针。

对阅读本书来说，知道这两种模型足够了。

> 我大概懂了作者的意思了，放在 C++ 里就是说别老一天天想着你那引用的本质就是指针，不同的时候要从不同的抽象层级看待你的代码。

#### High-Level Model

在 High-Level 角度，我们会把变量看成是值的名字，他们被初始化、被移动、被使用。在这种模型中，变量只有在拥有合法值的时候存在，你不能使用未初始化的变量，也不能使用值被移动的变量。

想象一下，你的变量在被访问时，会从先前一次访问的地方向这里画一条线，这条线称之为 *flow*，它描述了两次访问之间的依赖关系。你的程序会有许多这样的线，他们跟踪变量的生命周期，编译器跟踪这些 flows，每个 flow 只能在与其他 flows 兼容时才能存在。例如，不能同时有两个平行的 flows 指向同一个可变变量，也不能跟没有值的变量借用。

```rust
let mut x;

// 非法。x 没有值
assert_eq!(x, 42);

x = 42;		//(1)

// ok. flow 从第一次赋值时开始，
let y = &x;	//(2)	

// 第二个 mutable flow from x
x = 43;		//(3)

// 非法。 这个 flow 从 y 开始，但跟 x 的 flow 冲突。
assert_eq!(*y, 42);	//(4)
```

程序有两个 flows，一条是从(1) 到 (3) 的独占 flow（&mut），另外一条是从 (1) 穿过 (2) 到 (4) 的共享 flow。borrow checker 会对这些 flows 进行检查。你不能让独占 flow 和共享 flow 并存（3），所以编译会报错。如果没有 (4)，那么可以通过编译。

注意，如果声明了一个新的变量和之前的变量命名相同，它们仍然会被认为是不同的变量，这称为 *shadowing*。后面的变量以相同的名字 shadows 前面的变量。

#### Low-Lovel Model

变量名字的内存位置不一定拥有合法的值。你可以把变量想象成是：value slot. 你赋值，slot 被填充，旧的值会被 drop. 当你访问时，编译器会对这个 slot 进行检查。

这个层级的模型与 C/C++ 以及其他一些低级语言的模型是类似的，当你需要直面内存时你要这么考虑。

> 当然，这里我们忽略的 CPU 寄存器的存在。

这两种模型是并存的，你需要在你的脑子中建立起这种概念，而不是说谁比谁更好。如果你能在两个层面同时理解一段代码，那么你就会发现一段复杂的代码是如何工作、如何通过编译、如何按你的预期执行的。

---

### 内存区域

我们已经知道如何与内存交互，我们需要讨论内存究竟是什么？对 Rust 来说，最重要的内存区域有三个：Stack, Heap, Static Memory.

#### The Stack

*stack* 是一段程序在调用函数时使用的空间。每次一个函数被调用，都会在 *stack* 顶部分配一段连续的块内存，称之为 *frame*。栈底部的内存是 `main` 函数的 frame，随着其他函数的调用，frame 被一直 push 到栈中。函数的 frame 中保存了函数中所有的变量，以及函数调用需要的所有参数。函数返回时，frame 会被释放。

stack frames 最后释放的行为和 Rust 的生命周期紧密相关。

任何被释放的变量都无法再被访问，所以任何它的引用的生命周期都必须小于等于保存它的 frame 生命周期。

#### The Heap

*heap* 是不和当前函数的栈绑定的内存块。heap 中的变量必须被显式地解分配。如果你想让某个变量的生命周期比当前函数的 frame 活得更久，那就可以使用 heap。如果这个值是某函数的返回值，那么 calling 函数可以在它的栈上给被调用的函数留一些空间供其写入返回值；但如果你想把这个值传给其他线程，那么你就得使用 *heap*。

heap 允许你显式分配一段连续的内存，然后给你一个内存起始地址的指针。这段内存区域会在你解分配之前一直存在，解分配的过程通常称之为 *freeing*，对应 C 标准库中的函数。因为 heap 内存不会在函数返回后就释放的特性，你可以给某个值分配一个内存，然后把指针传递给另外一个线程，之后那个线程就可以安全的操作这个值了。

在 Rust 中，最重要的与 heap 内存交互的机制是使用 `Box` 类型。写出如 `Box::new(value)` 的代码时，这个值会被在 heap 上分配，而你拿到的是一个指向 heap 的指针的值（`Box<T>`）。`Box` 被 dropped 时，内存就被释放了。

如果你忘记了解分配 heap 内存，那就会内存泄漏，你需要避免。然而，有的时候你想要显示地泄露内存，例如，你需要一个只读的配置数据，整个程序都可以访问它，那么你可以使用 `Box::leak` 来获取一个它的 `'static` 引用。

> stack 和 heap 在这里都是操作系统概念，不要看网上的傻卵文章分什么什么区的，抽象层级不同。

#### 静态内存

***静态内存*** 包括了很多东西，这片区域会在你的程序启动时自动读取到内存中。静态内存区域中的值的生命周期和你的应用程序一样长。静态内存含有程序的二进制代码，通常是只读的。你的程序执行时，它会遍历所有的 text 段的二进制代码，在函数调用时进行跳转；静态内存区域也包含了你使用 `static` 关键字声明的变量，也包含一些常量，比如字符串字面量。

特殊的生命周期 `'static` 标记一个引用的生命周期和程序一样长。当然，**一个 `static` 引用也不一定指向静态内存区的变量，但重要的是其生命周期而不是变量实际存储的位置。**

使用 Rust 时，遇到 `'static` 生命周期会比实际的静态变量更频繁，因为许多类型参数的 trait bound 会使用 `T: 'static` 。特别地，这个 bound 需要约束 `T` 要么是其他静态值的借用，要么就是拥有所有权能够自治的值（不能是 非 static 的借用）。一个比较好的例子是 `std::thread::spawn` 函数，它要求你传入的闭包是 `'static`，因为新的线程可能活的比当前线程更久。

> 你可能会问 `const` 和 static 的区别。`const` 代表声明的 item 是常量，可以**在编译期进行计算**。常量不会占用内存。

---

### 所有权

Rust 的内存模型基于一个思想：所有的值都有一个 *所有者*。一个作用域有责任释放其内部的每个值，这个通过 borrow checker 保证。移动会改变所有权，在原先的作用域中不能访问被移动的对象。

有些类型不遵守这个规则，如果其实现了 `Copy` trait，那么这个变量就被认为永远不会被移动，而**每次都是进行拷贝。**不管是新的变量还是原来的变量，此时都可以被访问。大多数的基本类型都是 `Copy`，比如整型、浮点型等等。这样也可以避免内存释放的问题。这也可以消除非 `Copy` 类型的变量被 drop 时需要释放它拥有的资源。

谁拥有某值的所有权，谁就要负责在值被 drop 时清理它的资源。drop 在变量出作用域时自动发生。一个类型总是会递归的 drop 它包含的所有值。

> 说了这么多，就是一个弄清所有权防止被 double free。

Rust 总是会以逆序 drop 变量（包括函数参数），总是会以源码顺序 drop 一系列的值（比如数组）。

## 借用和生命周期

Rust 允许值的拥有者**通过引用**把值借给其他人，不需要交出所有权。**引用**是指针能被如何使用的一种约定，例如他们是否互斥访问，或者还是也可能有其他的引用指向这个变量。

> 看起来 Rust 的引用似乎跟指针有点纠缠不清。但在 C++ 里，引用就是引用，指针就是指针。

### 共享引用

共享引用，`&T`，如其名所示，可以被共享的指针。
