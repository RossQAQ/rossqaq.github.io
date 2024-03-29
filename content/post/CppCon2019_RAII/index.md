---
title: RAII and the Rule of Zero
description: 对 CppCon 2019, Arthur O'Dwyer 演讲的翻译与总结。
slug: CppCon 2019 RAII
date: 2023-12-23 00:00:00+0000
image: cppcon2019-cover.png
categories:
    - cppcon
    - finished
tags: 
weight: 1       # You can add weight to some posts to override the default sorting (date descending)
comments: false
---

[Lecture: Back to Basics: RAII and the Rule of Zero - Arthur O'Dwyer - CppCon 2019](https://www.youtube.com/watch?v=7Qgd9B1KuMQ)

[Slides PDF](https://github.com/CppCon/CppCon2019/blob/master/Presentations/back_to_basics_raii_and_the_rule_of_zero/back_to_basics_raii_and_the_rule_of_zero__arthur_odwyer__cppcon_2019.pdf)

RAII 即：Resource Acquisition Is Initialization，资源获取即初始化。

> 不会 RAII 等于不会 C++。	—— Roses

## 资源 Resource

资源代表某些我们需要手动管理的东西。C++ 中常见的资源有：

- 分配的内存（malloc/free, new/delete, new[]/delete[]）
- POSIX 文件句柄 （open/close）
- C 文件句柄（fopen/fclose）
- mutex 锁
- C++ 线程

我们无需关心资源是否唯一（例如mutex 的设计就是唯一的，而分配的内存显然可以拥有拷贝）

我们需要关心的是**程序中需要 *显式* 使用某些操作来 *释放* 资源**

之后会一直使用堆分配的内存作为例子。

## 以 naive vector 为例

### 基础实现

```cpp
class NaiveVector {
    int* ptr_;
    size_t size_;
public:
    NaiveVector() : ptr_(nullptr), size_(0) {}
    void push_back(int value) {
        int* new_ptr = new int[size_ + 1];
        std::copy(ptr_, ptr_ + size, new_ptr);
        delete[] ptr_;
        ptr_ = new_ptr;
        ptr_[size_++] = value;
    }
};
```

这里 push_back 先分配内存，再将原来的数据进行拷贝，最后写入新的数据，**释放原来位置的内存**，看起来没有问题。

考虑以下使用

```cpp
{
    NaiveVector vec;
    vec.push_back(1);
    vec.push_back(2);
}
```

这里，出作用域后，vec 的内存并没有被释放，显然是发生**内存泄漏**了。

也就是说，**需要在 vector 的生命周期结束时，释放其拥有的内存**。

---

### 析构函数

众所周知，在创建一个类类型的对象时，编译器会调用某个构造函数；在一个类类型对象的生命周期结束时，编译器会调用**析构函数**。

> 在 C++ 中，常用的限制某对象生命周期的方法就是使用一个大括号。

```cpp
{
    NaiveVector vec;	// 调用构造函数
}			// 调用析构函数
```

```cpp
class NaiveVector {
    ...
public:
    ...
    ~NaiveVector() {delete[] ptr_;}
};
```

现在 NaiveVector 就不会在被销毁时发生内存泄漏了。

----

### 拷贝构造函数

考虑代码：

```cpp
{
    NaiveVector v;
    v.push_back(1);
    {
        NaiveVector w = v;	//(1)
    }
    std::cout << v[0];
}
```

在 (1) 处调用了编译器自动生成的拷贝构造函数，默认的拷贝构造函数只是单纯的拷贝每个成员，这会导致二者持有指向同一块内存的指针，w 析构时内存会被释放，此时 v 访问的是已经被释放的内存。

> (1) 处的操作某些语言称之为“浅拷贝”。
>
> 需要注意的是，C++ 的设计哲学使得类对象应该具有值语义（标准库组件也是这么做的）。
>
> 换句话说，对对象进行拷贝应该像拷贝 `int` 等类型一样，进行“深拷贝”而不是所谓“浅拷贝”。
>
> 我其实并不想用在 C++ 中用这两个词语来描述，只是这样更容易理解。

这也是为什么 C++ 提供了拷贝构造函数的原因。**你需要他来为资源创建副本**。

我们来实现他：

```cpp
class NaiveVector {
    ...
public:
    NaiveVector() : ptr_(nullptr), size_(0) {}
    ~NaiveVector() {delete[] ptr_;}
    ...
    NaiveVector(const NaiveVector& rhs) {
        ptr_ = new int[rhs.size_];
        size_ = rhs.size_;
        std::copy(rhs.ptr_, rhs.ptr_ + size_, ptr_);
    }
};
```

### 初始化不是赋值

```cpp
NaiveVector w = v;	// 调用拷贝构造，创建一个新的对象
```

```cpp
NaiveVector w;
w = v;	// 对 w 的赋值，调用赋值运算符
```

这个问题似乎困扰了很多初学者，虽然看起来都使用了 `=` ，但实际不是一回事。

实际很容易理解，初始化时 w 什么都没有，自然需要构造，自然调用的是拷贝构造函数。

而在赋值时，w 已经是初始化结束的，或者被使用过的，内部已经存在数据了，可能需要对其进行其他处理，故自然不能调用拷贝构造，需要使用赋值运算符。

```cpp
{
    NaiveVector v;
    v.push_back(1);
    {
        NaiveVector w;
        w = v;
    }
    std::cout << v[0];
}
```

编译器默认生成的赋值运算符也是单纯的拷贝赋值所有数据成员，所以我们也需要实现他。

```cpp
class NaiveVector {
    ...
public:
    NaiveVector() : ptr_(nullptr), size_(0) {}
    ~NaiveVector() {delete[] ptr_;}
    NaiveVector(const NaiveVector& rhs) {...}
    ...
    NaiveVector& operator=(const NaiveVector& rhs) {
        NaiveVector copy = rhs;
        copy.swap(*this);	// copy and swap，我们需要实现 swap
        return *this;
    }
};
```

记住：

- 当你提供了析构函数时，大概率也需要提供一个拷贝构造函数 和 一个拷贝赋值运算符
- **析构函数的职责是防止资源泄漏，拷贝构造函数的职责是防止 `double free`**
- 这些规则适用于内存等任何你需要手动管理的资源

----

### The Rule of Three

如果你的类直接管理某些资源（见上文），你需要**提供以下三个成员函数**：

- **析构函数**，用于**释放**资源
- **拷贝构造函数**，用于**拷贝**资源，同时防止 double free

- **拷贝赋值运算符**，**释放** left-hand 资源，并**拷贝** right-hand 资源

推荐使用 `copy-and-swap` 技巧来实现赋值。

原因在于，手动实现不能很好的处理嵌套结构中 *self-assignment* 的情况。[关于自赋值的检测 [重载operator=要不要检查自赋值？ - mq白](https://zhuanlan.zhihu.com/p/673069657)]

使用 `copy-and-swap` 可以防止你在自赋值一些复杂的嵌套数据结构时爆炸。

```cpp
NaiveVector& NaiveVector::operator=(const NaiveVector& rhs) {
    NaiveVector copy(rhs);
    copy.swap(*this);
    return *this;
}
```

先对 rhs 做个拷贝，这样不管是任何的引用关系还是所有权，都不会对我们造成影响。

## RAII 与异常安全

虽然 RAII 是关于初始化的，但实际上他真正的意思是 ***cleanup***

也许应该 RAII 应该称作：Resource Freeing Is Destruction

析构函数帮助我们的程序在异常状态下也能稳定运行。

- C++支持 try/catch 以及 throw
- 异常抛出时，runtime 在调用者栈中查找一个与异常类型对应的 catch，假设他找到的话……
- runtime 进行 ***stack unwinding***。对于每个 throw 和 catch 之间的 local scope 中的变量调用析构函数
- 为避免泄漏，**请在析构函数中清理你的代码**

```cpp
int main() {
    try {
        int* arr = new int[4];
        throw std::runtime_error("BAD RAII Example");
        delete[] arr;	// 无法执行的 cleanup
    } catch (const std::exception& ex) {
        std::cout << "Exception: " << ex.what() << '\n';
    }
}
```

这里调用了 new，如果发生了异常，那么无法执行 delete，无法 cleanup，就会造成内存泄漏。

我们要做的是写一个自己的 RAII 类型

```cpp
struct RAIIPtr {
    int* ptr_;
    RAIIPtr(int* p) : ptr_(p) {}
    ~RAIIPtr() {delete[] ptr_;}
};
int main() {
    try {
        RAIIPtr arr = new int[4];
        throw std::runtime_error("example");
    } catch (const std::exception& ex) {
        std::cout << "Exception: " << ex.what() << '\n';
    }
}
```

把 delete 放入析构函数，发生异常时进行 stack unwinding 会析构 RAIIPtr，此时会正确调用。

但实际上 `RAIIPtr` 还是很危险，因为他有默认拷贝构造函数（没有遵循 Rule of Three）。

如果我们不想让 RAIIPtr 允许被拷贝，那么可以将其拷贝构造函数、拷贝赋值运算符都声明为 `= delete` 。

## The Rule of Zero

**如果你的类没有 *直接* 管理某些资源，只是单纯用了一些库组件，例如 `std::vector` 或者 `std::string` ，那么你 *不* 应该写特殊成员函数， *直接声明他们为 `default`。***

让编译器自动生成那些函数即可。

你也可以自己写 swap，也许会提高一些性能（编译器会ADL查找非成员函数的 swap）

(这里的意思是针对那 5 个成员函数，而不是针对构造函数，你可以实现一些构造函数，不会打破 rule of zero.)

## 尽可能多选择 Rule of Zero

以下两种值语义的类都是 well-designed :

- ***Business-logic classes***，不管理任何资源，遵循 Rule of Zero

  他们把管理资源的工作 **委托** 给数据成员，例如类中使用 std::string, std::vector, std::unique_ptr 等。这些类默认都遵守 RAII。

- ***Resource-management classes***(small, single-purpose), 遵循 Rule of Three

  构造函数获取资源，析构函数释放资源，在赋值运算符中 `copy-and-swap` 以及其他特殊成员函数

## The Rule of Five

在 C++11 之后，有了移动语义加持，我们引入了 The rule of five.

如果你的类直接管理某些资源（例如 new 出的指针），那么你需要**手写五个特殊成员函数**来确保正确的行为：

- **析构函数** 释放资源
- **拷贝构造函数** 拷贝资源
- **移动构造函数** 转义资源的所有权
- **拷贝赋值运算符** 释放 left-hand 资源，拷贝 right-hand 资源
- **移动赋值运算符** 释放 left-hand 资源，将 right-hand 的资源所有权转移

> 根本原因是用户定义（或者声明为 =default, = delete）的构造函数、拷贝构造函数、拷贝赋值运算符，都会阻止移动构造和移动赋值的生成，所以支持移动语义的类都需要你手动写出所有的特殊成员函数。
>
> 所有权，ownership，C++11之后 std::unique_ptr 等即代表独占所有权，配合移动语义，是一个较为重要的概念。但也有人不太喜欢这种说法。
>
> 隔壁 rust 好像很喜欢。

赋值运算符很容易出错，所以活用 `copy-and-swap`

那么移动赋值运算符怎么写 `copy-and-swap` 呢？

```cpp
NaiveVector& NaiveVector::opeartor=(NaiveVector&& rhs) {
    NaiveVector copy(std::move(rhs));
    copy.swap(*this);
    return *this;
}
```

## The Rule of Four(and a half)

### By-value 的赋值运算符？

虽然看似传值可以行为正确，但 STL 总是分开写移动和复制，所以你也应该将他们分开。更不能把 operator= 写成模板函数。

### The Rule of Four (and a half)

如果你的类直接管理某些资源（例如 new 出的指针），那么你需要**手写四个特殊成员函数**来确保正确的行为

- **析构函数** 释放资源
- **拷贝构造函数** 拷贝资源
- **移动构造函数** 转义资源的所有权
- **By-value** 的赋值运算符，释放 left-hand 资源，转移 right-hand 资源的所有权

1/2 - （非成员 swap 函数，理想情况下还要有一个成员函数版本）

## copy-and-swap

你需要编写一个 swap 函数才能实现 copy-and-swap，不然要么编译错误，要么使用 `std::swap`

那 `std::swap` 干了什么？

调用移动构造，调用移动赋值，再调用一次移动赋值。

如果你的赋值运算符的实现使用了 swap，然后还调用了 std::swap，然后 std::swap 又调用你的移动赋值运算符。恭喜你。

所以强烈推荐你，如果使用 copy-and-swap，那么就自己实现一个 `swap` 函数。

## 不再 Naive 的 vector

```cpp
class NaiveVector {
    int* ptr_;
    size_t size_;
    ...
    Vec(const Vec& rhs) {
        ptr_ = new int[rhs.size_];
        size_ = rhs.size_;
        std::copy(rhs.ptr_, rhs.ptr_ + size_, ptr_);
    }
    Vec(Vec&& rhs) noexcept {
        ptr_ = std::exchange(rhs.ptr_, nullptr);
        size_ = std::exchange(rhs.size_, 0);
    } 
    
    // 两个参数的 swap，让你的类 std::swappable
    friend void swap(Vec& a, Vec& b) noexcept {
        a.swap(b);
    }
    
    ~Vec() { delete[] ptr_; }
    
    Vec& operator=(const Vec& vec) {
        Vec copy(vec);
        copy.swap(*this);
        return *this;
    }
    
    Vec& operator=(Vec&& vec) noexcept {
        Vec copy(std::move(vec));
        copy.swap(*this);
        return *this;
    }
    
    void swap(Vec& rhs) noexcept {
        using std::swap;
        swap(ptr_, rhs.ptr_);
        swap(size_, rhs.size_);
    }
};
```

> std::exchange，以 new_value 替换 obj 的值，并返回 obj 的旧值。

注意两个参数的 swap，这里使用了叫 "hidden friend idiom"。

让两个参数的 swap 被 friend 标记，这样编译器就知道他不是成员函数（不是成员函数所以需要两个参数），这个 swap 支持 ADL 查找。这里他唯一做的就是调用一下成员函数 swap。

## 管理资源类的例子

### std::unique_ptr

以 `std::unique_ptr` 为例，它管理了堆内存的裸指针。

- **构造函数**释放资源
  - 对裸指针调用 delete
- **拷贝构造函数**复制资源
  - 显然不应该复制，它独占了这个资源的所有权。故 =delete
- **移动构造函数**转移资源所有权
  - 转移裸指针，确保 rhs 清空
- **拷贝赋值运算符**释放 left-hand 资源，并复制 right-hand 资源
  - 同拷贝构造
- **移动赋值运算符**释放 left-hand 资源，并转移 right-hand 资源所有权
  - 对 left-hand 调用 delete，转移 right-hand 资源并情况

### std::shared_ptr

以 `std::shared_ptr` 为例，它管理的是引用计数。

- **构造函数**释放资源
  - 减少引用计数（清理资源，如果引用计数归零）
- **拷贝构造函数**复制资源
  - 增加引用计数
- **移动构造函数**转移资源所有权
  - 保持引用计数不变，释放（disengages）右侧
- **拷贝赋值运算符**释放 left-hand 资源，并复制 right-hand 资源
  - 减少 left-hand 引用计数，增加 right-hand 引用计数
- **移动赋值运算符**释放 left-hand 资源，并转移 right-hand 资源所有权
  - 减少引用计数，释放（disengages）右侧

## “盗取”暗示了“空”状态

每个例子的移动操作，都释放了右侧的资源，也就是清空右侧状态。

如果你忘了，那么可能会 double-free

如果你忘记 destroy 右侧的对象，那么他可能就会处于空状态。

你可以只做 copy 和 destroy，如果你的对象复制开销不大的话。

当然 RAII 也可以 *只* 用于 destroy，单纯 =delete 你的复制和移动操作，就像 std::lock_guard
