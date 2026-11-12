const osQuestions = [
  [
    {
      "number": 1,
      "question": "Two cooperating processes exchange a large volume of data repeatedly on the same machine. Explain how shared memory can be used for IPC in this case. Identify the synchronization problem that may arise and explain one suitable mechanism to avoid inconsistent access to the shared region."
    },
    {
      "number": 2,
      "question": "Consider a client process that sends a request to a server process and waits for a reply. Explain how message passing can be used to implement this communication. Distinguish between direct and indirect communication and between blocking and non-blocking send/receive operations with reference to this scenario."
    },
    {
      "number": 3,
      "question": "A UNIX-like program has to create a child process, replace the child with another executable, wait for the child to finish, and then terminate. Identify suitable system calls for these operations and explain the role of each call in the process life cycle."
    },
    {
      "number": 4,
      "question": "Classify the following operations into appropriate system-call categories and explain one suitable UNIX-like call for each: creating a process, opening a file, reading a file, allocating memory, obtaining the current process ID, and terminating a process."
    },
    {
      "number": 5,
      "question": "Explain the role of the Process Control Block (PCB) during process execution and context switching. List the major information maintained in a PCB and explain why saving and restoring this information is necessary."
    },
    {
      "number": 6,
      "question": "A process moves through the states New, Ready, Running, Waiting/Blocked, and Terminated. Draw the process-state transition diagram and explain the event responsible for each transition. Also indicate where preemption and I/O completion occur."
    },
    {
      "number": 7,
      "question": "Differentiate between the long-term, short-term, and medium-term schedulers. Explain the primary function of each scheduler and analyze how each one influences the degree of multiprogramming and CPU utilization."
    },
    {
      "number": 8,
      "question": "Consider the following processes: P1(AT=0, BT=7), P2(AT=2, BT=4), P3(AT=4, BT=1), and P4(AT=5, BT=4). Using SRTF scheduling, draw the Gantt chart and calculate completion time, turnaround time, waiting time, and average waiting time."
    },
    {
      "number": 9,
      "question": "Consider P1(AT=0, BT=8), P2(AT=1, BT=5), P3(AT=2, BT=3), and P4(AT=4, BT=1). Apply Round Robin scheduling with time quantum = 2 ms. Draw the Gantt chart and calculate completion time, turnaround time, waiting time, and average waiting time."
    },
    {
      "number": 10,
      "question": "Consider the following processes. A smaller priority number indicates higher priority: P1(AT=0, BT=7, Pr=3), P2(AT=1, BT=4, Pr=1), P3(AT=2, BT=3, Pr=4), P4(AT=4, BT=2, Pr=2). Apply preemptive priority scheduling and calculate the average waiting time and average turnaround time."
    },
    {
      "number": 11,
      "question": "Four processes arrive at time 0 with burst times P1=10, P2=2, P3=6, and P4=4 ms. Determine the execution order, waiting time of each process, and average waiting time using non-preemptive SJF. Compare the result with FCFS in the order P1, P2, P3, P4."
    },
    {
      "number": 12,
      "question": "Explain the scheduling criteria used to evaluate CPU scheduling algorithms, including CPU utilization, throughput, turnaround time, waiting time, and response time. For an interactive system and a batch system, identify which criteria should receive higher importance and justify your answer."
    },
    {
      "number": 13,
      "question": "Differentiate between hard, firm, and soft real-time systems based on deadline requirements, usefulness of late results, and consequences of deadline misses. Give one suitable application example for each category."
    },
    {
      "number": 14,
      "question": "Consider three periodic tasks T1(C=1, T=4), T2(C=2, T=6), and T3(C=2, T=12), where deadline equals period. Assign priorities using Rate Monotonic Analysis (RMA), calculate total processor utilization, compare it with the Liu-Layland bound, and determine whether the task set is guaranteed schedulable."
    },
    {
      "number": 15,
      "question": "Consider periodic tasks T1(C=1, T=3), T2(C=1, T=4), and T3(C=2, T=8), with deadlines equal to periods. Construct the RMA schedule for one hyperperiod and determine whether all jobs meet their deadlines."
    },
    {
      "number": 16,
      "question": "For the task set T1(C=2, T=5), T2(C=2, T=7), and T3(C=3, T=12), assign RMA priorities and perform response-time analysis using Ri = Ci + Σ ceil(Ri/Tj)Cj for higher-priority tasks. Determine whether every task satisfies its deadline."
    },
    {
      "number": 17,
      "question": "Consider periodic tasks T1(C=1, T=4, D=4), T2(C=2, T=5, D=5), and T3(C=1, T=10, D=10). Calculate processor utilization and construct the EDF schedule for the interval 0 to 10. Determine whether all released jobs meet their deadlines."
    },
    {
      "number": 18,
      "question": "Four real-time jobs are given as J1(r=0, C=3, d=8), J2(r=1, C=2, d=5), J3(r=2, C=2, d=6), and J4(r=4, C=1, d=7). Apply preemptive EDF scheduling, draw the execution timeline, and determine whether any deadline is missed."
    },
    {
      "number": 19,
      "question": "Explain the semaphore abstraction and the operations wait(P) and signal(V). Differentiate between binary and counting semaphores. Show how a binary semaphore can enforce mutual exclusion for a critical section shared by multiple processes."
    },
    {
      "number": 20,
      "question": "A producer and consumer share a bounded buffer of size 6. Initially empty=6, full=0, and mutex=1. The successful operation sequence is P, P, P, C, P, C, P, C, C. Determine the values of empty, full, and mutex after each operation. State whether buffer overflow or underflow occurs at any stage."
    },
    {
      "number": 21,
      "question": "Write a semaphore-based solution for the bounded-buffer producer-consumer problem using mutex, empty, and full. Explain why the order of wait and signal operations is important and discuss what may happen if the producer executes wait(mutex) before wait(empty) when the buffer is full."
    },
    {
      "number": 22,
      "question": "Explain how a monitor provides high-level process synchronization. Using a bounded-buffer example, describe the role of condition variables and the wait() and signal() operations inside a monitor. Compare monitor- based synchronization with semaphore-based synchronization."
    },
    {
      "number": 23,
      "question": "Develop a semaphore-based solution for the Readers-Writers problem that allows multiple readers to access the shared data concurrently but gives writers exclusive access. Explain the purpose of each semaphore and shared variable used in your solution."
    },
    {
      "number": 24,
      "question": "Five philosophers sit around a circular table with one fork between each pair. Formulate the Dining Philosophers problem using semaphores. Explain how a straightforward solution can lead to deadlock and describe one semaphore-based modification that prevents deadlock."
    },
    {
      "number": 25,
      "question": "Explain the four necessary conditions for deadlock. For each condition, describe one system-level strategy that attempts to prevent deadlock by ensuring that the condition cannot hold."
    },
    {
      "number": 26,
      "question": "A system has five processes and three resource types A, B, and C. The matrices are: Allocation: P0=(0,1,0), P1=(2,0,0), P2=(3,0,2), P3=(2,1,1), P4=(0,0,2) Max: P0=(7,5,3), P1=(3,2,2), P2=(9,0,2), P3=(2,2,2), P4=(4,3,3) Available=(3,3,2). Using Banker's Algorithm, calculate the Need matrix, determine whether the system is safe, and find one safe sequence."
    },
    {
      "number": 27,
      "question": "Using the system data of the Banker's Algorithm problem in Q26, process P1 makes the request (1,0,2). Apply the resource-request algorithm and determine whether the request can be granted immediately without leaving the system in an unsafe state. Show all intermediate steps."
    },
    {
      "number": 28,
      "question": "Consider four processes P1, P2, P3, and P4 and four single-instance resources R1, R2, R3, and R4. The relationships are R1→P1, P1→R2, R2→P2, P2→R3, R3→P3, P3→R1, and R4→P4. Construct the Resource Allocation Graph, identify the cycle, determine the deadlocked processes, and explain why P4 is or is not part of the deadlock."
    },
    {
      "number": 29,
      "question": "A system has multiple instances of three resource types. Given the current Allocation, Request, and Available vectors for each process, explain the deadlock-detection algorithm for multiple instances. Then apply it to the following data: Available=(0,0,0) Allocation: P0=(0,1,0), P1=(2,0,0), P2=(0,0,2), P3=(1,1,0) Request: P0=(0,0,0), P1=(0,1,0), P2=(1,0,0), P3=(0,0,1). Determine which processes, if any, are deadlocked."
    },
    {
      "number": 30,
      "question": "A deadlock has been detected involving several processes that hold different amounts of resources and have different execution progress. Discuss deadlock recovery through process termination and resource preemption. Propose suitable criteria for selecting a victim process and explain how rollback and starvation can arise during repeated recovery."
    }
  ],
  [
    {
      "number": 1,
      "question": "Define Logical Address Space (LAS) and Physical Address Space (PAS). A system has a 16 -bit logical address and a 20-bit physical address. Calculate the size of LAS and PAS in bytes, assuming byte -addressable memory. State how many distinct logical addresses and physical addresses are possible."
    },
    {
      "number": 2,
      "question": "A system has a 32-bit logical address space and a page size of 4 KB. Physical memory is 1 GB. Calculate: (i) number of bits in the page offset, (ii) number of bits in the page number, (iii) total number of virtual pages, and (iv) number of physical frames. Show all steps."
    },
    {
      "number": 3,
      "question": "A computer has a 24-bit logical address and a page size of 1 KB. Each page-table entry occupies 4 bytes. Assuming a single-level page table with one entry for every virtual page, calculate: (i) page size in bytes, (ii) number of virtual pages, (iii) page-table size in entries, and (iv) page-table size in bytes and KB."
    },
    {
      "number": 4,
      "question": "A system has a 30-bit logical address space, 2 KB pages, 512 MB of physical memory, and 4 -byte page-table entries. Calculate LAS, page size, number of virtual pages, number of physical frames, and the size of a single -level page table. State whether the entire page table could fit in 1 MB."
    },
    {
      "number": 5,
      "question": "A byte-addressable system has LAS = 64 MB, PAS = 16 MB, and page size = 4 KB. Calculate the number of logical address bits, physical address bits, offset bits, virtual pages, and physical frames."
    },
    {
      "number": 6,
      "question": "A process has a 64 KB logical address space and a page size of 2 KB. The page table maps virtual pages 0–31 to physical frames as follows: 5, 2, 9, 1, 12, 4, 7, 3, 8, 0, 6, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31. Translate logical address 10,250 into a physical address. Show page number, offset, frame number, and final address."
    },
    {
      "number": 7,
      "question": "A system uses 4 KB pages and has 4-byte page-table entries. LAS is 4 GB and PAS is 256 MB. Calculate the number of virtual pages, number of physical frames, single-level page-table size in bytes and MiB, and the number of bits needed for page number and frame number."
    },
    {
      "number": 8,
      "question": "A system uses 2-level paging with a 32-bit logical address split into 10 bits for the outer page number, 10 bits for the inner page number, and 12 bits for the offset. Each page-table entry is 4 bytes and each page table must fit in one page. Calculate the page size, entries per inner page table, size of one inner page table, number of possible outer entries, and maximum memory used by the outer page table."
    },
    {
      "number": 9,
      "question": "A system has a 20-bit logical address and 16-bit physical address. Page size is 1 KB. The page table maps virtual page 3 to frame 12 and virtual page 7 to frame 5. Translate logical addresses 3500 and 7600. For each, calculate page number, offset, frame number, and physical address. If a page is not mapped, state that the translation cannot be completed."
    },
    {
      "number": 10,
      "question": "Explain first-fit, best-fit, and worst-fit memory allocation. Free holes are 100 KB, 500 KB, 200 KB, 300 KB, and 600 KB in that order. Allocate processes of 212 KB, 417 KB, 112 KB, and 426 KB in that order using each algorithm. Show the allocation and remaining holes."
    },
    {
      "number": 11,
      "question": "Explain internal and external fragmentation. A process requests 18,500 bytes and is allocated five fixed -size pages of 4 KB each. Calculate the allocated memory and internal fragmentation. Explain why this example does not by itself demonstrate external fragmentation."
    },
    {
      "number": 12,
      "question": "A segmentation system has the following segment table: S0 base = 1000, limit = 400; S1 base = 2400, limit = 600; S2 base = 5000, limit = 300. For logical addresses (S0, 250), (S1, 650), and (S2, 299), determine validity and physical address where valid. Explain the limit check."
    },
    {
      "number": 13,
      "question": "Compare paging and segmentation with respect to address format, allocation, fragmentation, protection, and programmer visibility. Include a small example of each address format."
    },
    {
      "number": 14,
      "question": "Explain the purpose of a page table, page-table base register, valid/invalid bit, protection bit, and reference/dirty bits. State how these bits help memory management."
    },
    {
      "number": 15,
      "question": "A system has 8 GB of byte-addressable physical memory and a page size of 8 KB. Calculate the number of frames and the number of frame-number bits. If LAS is 48 bits, calculate the number of virtual pages and page -number bits."
    },
    {
      "number": 16,
      "question": "A system has a 36-bit virtual address and 4 KB page size. Each page-table entry is 8 bytes. Calculate the number of virtual pages and the size of a flat page table in bytes, GiB, and MiB. Explain briefly why multilevel paging may be preferable."
    },
    {
      "number": 17,
      "question": "Explain the role of the MMU in paging. A process generates logical address 8195 with page size 4 KB, and its page maps to frame 10. Calculate the page number, offset, and physical address."
    },
    {
      "number": 18,
      "question": "Describe swapping and compaction. A system has free holes of 10 MB, 18 MB, 7 MB, and 15 MB. A process needs 25 MB. Explain whether it can be allocated without compaction, and calculate the total free memory. State what compaction would need to achieve."
    },
    {
      "number": 19,
      "question": "Explain the difference between a page and a frame. A process has LAS of 128 MB, page size 8 KB, and the machine has PAS of 64 MB. Calculate virtual pages, physical frames, and the ratio of virtual pages to physical frames."
    },
    {
      "number": 20,
      "question": "Explain fixed and variable partitioning. A 100 KB process is placed in a 128 KB fixed partition. Calculate internal fragmentation. If variable partitioning allocates exactly 100 KB, compare the internal fragmentation and mention the possible external-fragmentation issue."
    },
    {
      "number": 21,
      "question": "Analyze a reference to segment 2 with offset 430 when its segment-table entry has base=4000 and limit=500. Determine whether the reference is valid and, if valid, calculate the physical address. Examine what happens if the offset is 520 instead."
    },
    {
      "number": 22,
      "question": "Explain demand paging and describe, in sequence, the steps performed by the operating system when a valid page fault occurs."
    },
    {
      "number": 23,
      "question": "Differentiate between a page fault caused by a valid page that is not resident and an invalid memory reference. What actions does the OS take in each case?"
    },
    {
      "number": 24,
      "question": "Explain the Translation Lookaside Buffer (TLB). A TLB lookup takes 8 ns, memory access takes 70 ns, and the TLB hit ratio is 90%. On a hit, one memory access is required; on a miss, two memory accesses are required. Neglect TLB update time. Calculate effective access time."
    },
    {
      "number": 25,
      "question": "A system has memory access time 100 ns and page-fault service time 6 ms. The page-fault probability is 0.0002. Assuming the page-fault service time is additional to normal access, calculate effective access time. Show unit conversion."
    },
    {
      "number": 26,
      "question": "Analyze a system with a 32-bit logical address, page size 4 KB, and a single-level page table. Calculate the number of page-offset bits and page-number bits. If each page-table entry is 4 bytes, calculate the page-table size for the full logical address space."
    },
    {
      "number": 27,
      "question": "Explain FIFO, LRU, Optimal, and Second-Chance page replacement. Compare the information each algorithm uses and identify which is mainly a theoretical benchmark."
    },
    {
      "number": 28,
      "question": "Using 3 empty frames and the reference string 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, trace FIFO page replacement. Show frame contents after every reference and calculate total page faults and hits."
    },
    {
      "number": 29,
      "question": "Using 3 empty frames and the reference string 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, trace LRU page replacement. Show frame contents after every reference and calculate total page faults and hits."
    },
    {
      "number": 30,
      "question": "Using 3 empty frames and the reference string 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, trace Optimal page replacement. Show frame contents after every reference and calculate total page faults and hits."
    },
    {
      "number": 31,
      "question": "For the reference string 1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5, calculate FIFO page faults using 3 frames and 4 frames. Show the replacement sequence and state whether Belady’s anomaly occurs."
    },
    {
      "number": 32,
      "question": "A process has 4 page frames and uses LRU. For the reference string 2, 3, 2, 1, 5, 2, 4, 5, 3, 2, 5, 2, show the frame contents after every reference and calculate page faults and hits."
    },
    {
      "number": 33,
      "question": "For the reference string 0, 1, 2, 3, 0, 1, 4, 0, 1, 2, 3, 4 and 3 frames, calculate page faults for FIFO and Optimal. Show enough of the frame-state trace to justify each total."
    },
    {
      "number": 34,
      "question": "A system has 12 available frames. Three processes have working -set requirements of 5, 4, and 6 frames. Determine whether all working sets fit simultaneously. If not, calculate the frame shortage and explain the likely effect on CPU utilization."
    },
    {
      "number": 35,
      "question": "Define thrashing. Explain the working-set model and page-fault-frequency method as approaches to detecting or controlling thrashing."
    },
    {
      "number": 36,
      "question": "Explain copy-on-write with a process-creation example. Why can it reduce physical memory use and startup time?"
    },
    {
      "number": 37,
      "question": "Compare local and global page replacement. Give one benefit and one drawback of each, particularly when multiple processes compete for frames."
    },
    {
      "number": 38,
      "question": "LAS is 1 GB and page size is 4 KB. A process has 24 KB of resident memory. Calculate the number of virtual pages, resident frames, and the fraction of the virtual address space currently resident."
    },
    {
      "number": 39,
      "question": "Analyze a system with Logical Address Space (LAS) of 4 GB, page size 4 KB, and Physical Address Space (PAS) of 64 MB. Draw the logical and physical addresses with each component. Calculate the number of pages, frames, page -table entries, and size of the page table."
    },
    {
      "number": 40,
      "question": "Analyze a system with TLB lookup time 10 ns, memory access time 80 ns, and TLB hit ratio 0.90. On a hit, one memory access is needed; on a miss, two memory accesses are needed. Calculate the effective memory access time (EAT), ignoring TLB update time."
    },
    {
      "number": 41,
      "question": "Analyze a 32-bit logical address using a 4 KB page size and a two-level page table. Each page-table entry is 4 bytes and each page table occupies one page. Determine the offset bits, entries per page table, and a valid split of the page - number bits across the two levels."
    },
    {
      "number": 42,
      "question": "Analyze a paging system with a single-level page table in main memory and a TLB. Main-memory access takes 100 ns, TLB lookup 20 ns, page-fault service 5000 ns, TLB hit ratio 95%, and page-fault rate 10%. Calculate the effective memory access time (EAT), ignoring TLB update time."
    },
    {
      "number": 43,
      "question": "Define seek time, rotational latency, transfer time, and disk access time. A disk has average seek time 5 ms, rotates at 7200 RPM, and transfers a block in 0.6 ms. Calculate average access time, assuming average rotational latency is half a rotation."
    },
    {
      "number": 44,
      "question": "Analyze the C-SCAN disk scheduling sequence when the disk head is at cylinder 50 and the request queue is 82, 170, 43, 140, 24, 16, 190. Draw the head-movement sequence and calculate the total head movement."
    },
    {
      "number": 45,
      "question": "A system uses the FIFO page replacement algorithm for the reference string: [1,2,3,4,1,2,5,1,2,3,4,5]. Analyze the page replacement behavior under the following two scenarios: Scenario 1: The system has 3 page frames. Scenario 2: The system has 4 page frames. For each scenario, determine the total number of page faults and analyze whether Belady's Anomaly occurs when the number of frames is increased from 3 to 4. Justify your conclusion based on the obtained page -fault counts."
    },
    {
      "number": 46,
      "question": "Explain FCFS and SSTF disk scheduling. For the request queue 98, 183, 37, 122, 14, 124, 65, 67, with the head initially at cylinder 53, calculate total head movement under FCFS and SSTF. Assume cylinders 0–199."
    },
    {
      "number": 47,
      "question": "For the request queue 98, 183, 37, 122, 14, 124, 65, 67, with head initially at 53 and cylinders 0–199, calculate total head movement using SCAN, assuming the head initially moves toward cylinder 0 before reversing. Show service order and movement."
    },
    {
      "number": 48,
      "question": "For the same queue and starting position 53, calculate total head movement using C -SCAN, assuming the head moves toward higher cylinders first, travels to 199, jumps to 0, and then continues upward. Include the end travel and wraparound in the total."
    },
    {
      "number": 49,
      "question": "A disk has requests at cylinders 20, 35, 70, 90, 110, and 150. The head is at 80 and is moving toward higher -numbered cylinders. Calculate total head movement for LOOK and C-LOOK. State the service order for each and make your wraparound assumption explicit."
    },
    {
      "number": 50,
      "question": "A disk rotates at 10,000 RPM. Calculate the time for one complete rotation and average rotational latency in milliseconds. If average seek time is 4.5 ms and transfer time is 0.3 ms, calculate average disk access time."
    },
    {
      "number": 51,
      "question": "A disk has 6 platters, 2 recording surfaces per platter, 1500 tracks per surface, and 400 sectors per track. Each sector stores 512 bytes. Calculate total raw capacity in bytes, MiB, and GiB."
    },
    {
      "number": 52,
      "question": "Explain RAID 0, RAID 1, RAID 5, and RAID 6. For an array of five 2 TB disks, calculate usable capacity under RAID 0, RAID 1 (mirroring all disks as one mirrored set only if layout is specified; state a reasonable assumption), RAID 5, and RAID 6. State fault tolerance for each."
    },
    {
      "number": 53,
      "question": "Describe disk formatting, partitioning, boot blocks, bad-block management, and swap-space management. Explain the role of each."
    },
    {
      "number": 54,
      "question": "Compare FCFS, SSTF, SCAN, C-SCAN, LOOK, and C-LOOK in terms of movement, fairness, starvation risk, and direction of travel."
    },
    {
      "number": 55,
      "question": "Requests are 40, 10, 90, 30, 80, and 20. The head starts at 50 and cylinders range from 0 to 99. Calculate total head movement under FCFS and SSTF, showing the service sequence."
    },
    {
      "number": 56,
      "question": "Analyze the reference string 1, 2, 3, 1, 4, 2, 5, 1, 2, 3 using LRU page replacement with three empty frames. Show the frame contents after each reference, count the page faults, and calculate the hit ratio and miss ratio."
    },
    {
      "number": 57,
      "question": "List and explain common file attributes and file operations supported by an operating system. Distinguish file name, identifier, type, location, size, protection, timestamps, create, open, read, write, seek, close, and delete."
    },
    {
      "number": 58,
      "question": "Compare sequential, direct, and indexed file-access methods. Explain how a program locates a record under each method and provide one suitable use case per method."
    },
    {
      "number": 59,
      "question": "Explain single-level, two-level, tree-structured, acyclic-graph, and general-graph directory structures. State one advantage or limitation of each."
    },
    {
      "number": 60,
      "question": "Compare contiguous, linked, and indexed file allocation with respect to access time, fragmentation, metadata overhead, file growth, and reliability."
    },
    {
      "number": 61,
      "question": "Explain bitmap, linked-list, grouping, and counting methods for free-space management. Which method is efficient when many consecutive blocks are free, and why?"
    },
    {
      "number": 62,
      "question": "Explain file protection using access-control lists and capability lists. Describe read, write, execute, append, delete, and list permissions with examples."
    },
    {
      "number": 63,
      "question": "Explain hard links and symbolic links. Compare their behavior when the original pathname is removed and describe how they refer to file data."
    },
    {
      "number": 64,
      "question": "Explain the purpose of an inode or file control block. What metadata does it store, and why is the filename commonly stored in a directory entry rather than the inode?"
    },
    {
      "number": 65,
      "question": "Describe journaling in a file system. Distinguish metadata journaling from full data journaling and explain how journaling helps after a crash."
    },
    {
      "number": 66,
      "question": "A file is 23 KB and the file system uses 4 KB blocks. Calculate the number of data blocks required and the internal waste in the final block. Show the ceiling calculation."
    },
    {
      "number": 67,
      "question": "A file system contains 2^20 blocks and uses one bit per block in a free-space bitmap. Calculate bitmap size in bits, bytes, KiB, and MiB."
    },
    {
      "number": 68,
      "question": "An indexed-allocation file system uses 4 KB blocks and 4-byte pointers. One index block contains only pointers to data blocks. Calculate the number of data-block pointers per index block and the maximum file size addressable by one index block."
    },
    {
      "number": 69,
      "question": "Apply the concepts of contiguous, linked, and indexed file allocation to illustrate how files are stored using each method. Show their access efficiency, fragmentation characteristics, and one suitable use case for each."
    },
    {
      "number": 70,
      "question": "Apply the concept of file-system directories to illustrate single-level and tree-structured directory organizations. Demonstrate one advantage of the tree-structured organization."
    },
    {
      "number": 71,
      "question": "Apply the concept of indexed allocation to illustrate how the index block locates file data blocks. Demonstrate one advantage and one overhead of indexed allocation compared with linked allocation."
    },
    {
      "number": 72,
      "question": "Linked allocation uses 1 KB blocks, of which 4 bytes per block are reserved for a next -block pointer. Calculate the data payload per block and total payload for a file occupying 100 blocks. Ignore all other metadata."
    },
    {
      "number": 73,
      "question": "A file system has 1,000,000 blocks of 4 KB each and uses a bitmap with one bit per block. Calculate total disk capacity and bitmap size in bytes and MiB."
    },
    {
      "number": 74,
      "question": "A file has 12 direct pointers and one single-indirect pointer in its inode. Block size is 4 KB and each pointer is 4 bytes. Calculate the number of data blocks addressable through the direct pointers and single -indirect block, then calculate the maximum file size in MiB. Ignore double- and triple-indirect pointers."
    },
    {
      "number": 75,
      "question": "A file system uses 4 KB blocks and must store a file of 8 MiB. Calculate the number of data blocks required. If a single - level index block is 4 KB and each pointer is 4 bytes, calculate the number of pointers available and determine whether one index block is sufficient."
    }
  ]
];
